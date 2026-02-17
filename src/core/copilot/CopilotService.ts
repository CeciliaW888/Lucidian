/**
 * CopilotService — GitHub Copilot backend for Claudian.
 *
 * Implements the same streaming interface as ClaudianService (AsyncGenerator<StreamChunk>)
 * so all UI components (StreamController, MessageRenderer, InputController) work unchanged.
 *
 * Architecture:
 * - User message → OpenAI chat format → Copilot API (streaming SSE)
 * - SSE chunks → Claudian StreamChunk format → UI rendering (real-time)
 * - Tool calls executed locally via CopilotToolExecutor
 * - Multi-turn agent loop (up to MAX_TOOL_ROUNDS)
 */

import type { App } from 'obsidian';

import type { SlashCommand } from '../types';
import type { ChatMessage, ImageAttachment, StreamChunk } from '../types/chat';
import { type CopilotToken,fetchCopilotToken, isTokenExpired } from './auth';
import { type CopilotChatMessage, type CopilotToolCall, fetchModels, streamChat } from './client';
import { CopilotToolExecutor } from './executor';
import { apiModelToOption, COPILOT_FALLBACK_MODELS, type CopilotModelOption, DEFAULT_COPILOT_MODEL_ID } from './models';
import { COPILOT_TOOL_DEFINITIONS } from './tools';

const MAX_TOOL_ROUNDS = 25;

const SYSTEM_PROMPT = `You are an AI assistant embedded in Obsidian, a knowledge management application.
You have full access to the user's vault (files, folders, notes) and can read, write, edit files,
run bash commands, search for patterns, and list directories.

Key capabilities:
- Read and understand any file in the vault
- Create new files and edit existing ones
- Run bash/shell commands for development tasks
- Search across files using grep and glob patterns
- List directory contents

Guidelines:
- Always read files before editing them to understand context
- Use relative paths from the vault root
- Be concise but thorough in responses
- When editing files, prefer targeted edits over full rewrites
- For code changes, explain what you're doing and why`;

/** Matches ClaudianService's QueryOptions shape (duck-typed). */
interface CopilotQueryOptions {
  allowedTools?: string[];
  model?: string;
  forceColdStart?: boolean;
  externalContextPaths?: string[];
  [key: string]: unknown;
}

/** Matches ClaudianService's EnsureReadyOptions shape (duck-typed). */
interface CopilotEnsureReadyOptions {
  sessionId?: string;
  externalContextPaths?: string[];
  force?: boolean;
  preserveHandlers?: boolean;
}

export class CopilotService {
  private app: App;
  private vaultPath: string;
  private pat: string;
  private copilotToken: CopilotToken | null = null;
  private selectedModel: string;
  private executor: CopilotToolExecutor;
  private abortController: AbortController | null = null;
  private _isReady = false;
  private readyStateListeners = new Set<(ready: boolean) => void>();
  private customSystemPrompt = '';
  private cachedModels: CopilotModelOption[] | null = null;

  constructor(app: App, vaultPath: string, pat: string, model?: string) {
    this.app = app;
    this.vaultPath = vaultPath;
    this.pat = pat;
    this.selectedModel = model ?? DEFAULT_COPILOT_MODEL_ID;
    this.executor = new CopilotToolExecutor(app, vaultPath);
  }

  // ── Core streaming interface (matches ClaudianService) ──

  async *query(
    prompt: string,
    images?: ImageAttachment[],
    conversationHistory?: ChatMessage[],
    _queryOptions?: CopilotQueryOptions,
  ): AsyncGenerator<StreamChunk> {
    if (!this.pat) {
      yield { type: 'error', content: 'Not authenticated with GitHub Copilot. Please sign in via Settings.' };
      return;
    }

    let token: string;
    try {
      token = await this.ensureCopilotToken();
    } catch (err) {
      yield { type: 'error', content: `Copilot auth failed: ${err instanceof Error ? err.message : String(err)}` };
      return;
    }

    // Build initial messages
    const messages = this.buildMessages(prompt, images, conversationHistory);
    this.abortController = new AbortController();

    try {
      // Agent loop: stream → tool calls → execute → stream again
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const roundResult = yield* this.streamOneRound(token, messages);

        if (roundResult.aborted) return;
        if (roundResult.error) {
          yield { type: 'error', content: roundResult.error };
          return;
        }

        // No tool calls → response is complete
        if (roundResult.toolCalls.length === 0) {
          yield { type: 'done' };
          return;
        }

        // Add assistant message with tool calls to conversation
        messages.push({
          role: 'assistant',
          content: roundResult.textContent || null,
          tool_calls: roundResult.toolCalls,
        });

        // Execute each tool call
        for (const tc of roundResult.toolCalls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function.arguments);
          } catch { /* empty args */ }

          // Yield tool_use to show in UI
          yield { type: 'tool_use', id: tc.id, name: tc.function.name, input: args };

          // Execute tool
          const result = await this.executor.execute(tc.function.name, args);

          // Yield tool_result for UI
          yield { type: 'tool_result', id: tc.id, content: result.content, isError: result.isError };

          // Add tool result to conversation for next round
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: result.content,
          });
        }

        // Refresh token if needed before next round
        if (this.copilotToken && isTokenExpired(this.copilotToken.expiresAt)) {
          token = await this.ensureCopilotToken();
        }
      }

      yield { type: 'error', content: `Max tool rounds (${MAX_TOOL_ROUNDS}) exceeded` };
    } catch (err) {
      if (!this.abortController?.signal.aborted) {
        yield { type: 'error', content: err instanceof Error ? err.message : String(err) };
      }
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Streams one round of the conversation.
   * Yields text StreamChunks in real-time as SSE deltas arrive.
   * Returns accumulated tool calls (if any) for the agent loop.
   */
  private async *streamOneRound(
    token: string,
    messages: CopilotChatMessage[],
  ): AsyncGenerator<StreamChunk, {
    textContent: string;
    toolCalls: CopilotToolCall[];
    error?: string;
    aborted?: boolean;
  }> {
    let textContent = '';
    const toolCallsMap = new Map<number, {
      id: string;
      type: 'function';
      function: { name: string; arguments: string };
    }>();

    try {
      for await (const sseChunk of streamChat(
        token,
        messages,
        this.selectedModel,
        COPILOT_TOOL_DEFINITIONS,
        this.abortController?.signal,
      )) {
        const choice = sseChunk.choices?.[0];
        if (!choice) continue;

        const delta = choice.delta;

        // Stream text content to UI in real-time
        if (delta.content) {
          textContent += delta.content;
          yield { type: 'text', content: delta.content };
        }

        // Accumulate tool calls (built incrementally via index)
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const existing = toolCallsMap.get(tc.index);
            if (!existing) {
              toolCallsMap.set(tc.index, {
                id: tc.id ?? `tc_${tc.index}_${Date.now()}`,
                type: 'function',
                function: {
                  name: tc.function?.name ?? '',
                  arguments: tc.function?.arguments ?? '',
                },
              });
            } else {
              if (tc.function?.arguments) {
                existing.function.arguments += tc.function.arguments;
              }
              if (tc.function?.name) {
                existing.function.name = tc.function.name;
              }
            }
          }
        }
      }
    } catch (err) {
      if (this.abortController?.signal.aborted) {
        return { textContent, toolCalls: [], aborted: true };
      }
      return {
        textContent,
        toolCalls: [],
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const toolCalls = Array.from(toolCallsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([, tc]) => tc as CopilotToolCall);

    return { textContent, toolCalls };
  }

  // ── Lifecycle & state (matches ClaudianService interface) ──

  cancel(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  getSessionId(): string | null {
    return null;
  }

  setSessionId(_id: string | null, _externalContextPaths?: string[]): void {
    // No-op
  }

  isReady(): boolean {
    return this._isReady;
  }

  async ensureReady(_options?: CopilotEnsureReadyOptions): Promise<boolean> {
    if (!this.pat) return false;

    try {
      const token = await this.ensureCopilotToken();
      this._isReady = true;
      this.notifyReadyStateChange();

      // Best-effort: fetch available models after auth succeeds
      this.fetchAvailableModels(token).catch(() => {});

      return true;
    } catch {
      this._isReady = false;
      this.notifyReadyStateChange();
      return false;
    }
  }

  isPersistentQueryActive(): boolean {
    return this._isReady;
  }

  onReadyStateChange(listener: (ready: boolean) => void): () => void {
    this.readyStateListeners.add(listener);
    try { listener(this._isReady); } catch { /* ignore */ }
    return () => { this.readyStateListeners.delete(listener); };
  }

  setPendingResumeAt(_uuid: string | undefined): void {
    // No-op
  }

  applyForkState(_conv: { sessionId?: string | null; sdkSessionId?: string; forkSource?: unknown }): string | null {
    return null;
  }

  async shutdown(): Promise<void> {
    this.cancel();
    this._isReady = false;
  }

  async getSupportedCommands(): Promise<SlashCommand[]> {
    return [];
  }

  async reloadMcpServers(): Promise<void> {
    // No-op
  }

  async rewindFiles(_sdkUserUuid: string, _dryRun?: boolean): Promise<{ files: string[] }> {
    return { files: [] };
  }

  async rewind(_sdkUserUuid: string, _prevAssistantUuid?: string): Promise<{
    canRewind: boolean;
    error?: string;
    filesChanged?: string[];
  }> {
    return {
      canRewind: false,
      error: 'Rewind not supported in Copilot mode',
      filesChanged: [],
    };
  }

  consumeSessionInvalidation(): boolean {
    return false;
  }

  async cleanup(): Promise<void> {
    // No-op
  }

  async resetSession(): Promise<void> {
    // No-op
  }

  closePersistentQuery(_reason?: string): void {
    // No-op
  }

  // Callback stubs (matching ClaudianService interface)
  setApprovalCallback(_callback: unknown): void { /* no-op */ }
  setApprovalDismisser(_dismisser: unknown): void { /* no-op */ }
  setAskUserQuestionCallback(_callback: unknown): void { /* no-op */ }
  setExitPlanModeCallback(_callback: unknown): void { /* no-op */ }
  setPermissionModeSyncCallback(_callback: unknown): void { /* no-op */ }

  // ── Copilot-specific methods ──

  setModel(model: string): void {
    this.selectedModel = model;
  }

  getModel(): string {
    return this.selectedModel;
  }

  setCustomSystemPrompt(prompt: string): void {
    this.customSystemPrompt = prompt;
  }

  updatePat(pat: string): void {
    this.pat = pat;
    this.copilotToken = null;
    this.cachedModels = null;
    this._isReady = false;
  }

  getAvailableModels(): CopilotModelOption[] {
    return this.cachedModels ?? COPILOT_FALLBACK_MODELS;
  }

  // ── Private helpers ──

  private async fetchAvailableModels(token: string): Promise<void> {
    try {
      const apiModels = await fetchModels(token);
      if (apiModels.length === 0) return;

      const models = apiModels.map(apiModelToOption);
      this.cachedModels = models;

      // Auto-select first available if current model isn't in the list
      if (!models.some(m => m.id === this.selectedModel)) {
        this.selectedModel = models[0].id;
      }
    } catch {
      // Silent fallback to hardcoded list
    }
  }

  private async ensureCopilotToken(): Promise<string> {
    if (this.copilotToken && !isTokenExpired(this.copilotToken.expiresAt)) {
      return this.copilotToken.token;
    }
    this.copilotToken = await fetchCopilotToken(this.pat);
    return this.copilotToken.token;
  }

  private notifyReadyStateChange(): void {
    const ready = this._isReady;
    for (const listener of this.readyStateListeners) {
      try { listener(ready); } catch { /* ignore */ }
    }
  }

  private buildMessages(
    prompt: string,
    images?: ImageAttachment[],
    conversationHistory?: ChatMessage[],
  ): CopilotChatMessage[] {
    const messages: CopilotChatMessage[] = [];

    // System prompt
    const systemContent = this.customSystemPrompt
      ? `${SYSTEM_PROMPT}\n\n${this.customSystemPrompt}`
      : SYSTEM_PROMPT;
    messages.push({ role: 'system', content: systemContent });

    // Convert Claudian history to OpenAI chat format
    if (conversationHistory) {
      for (const msg of conversationHistory) {
        if (msg.isInterrupt || msg.isRebuiltContext) continue;

        if (msg.role === 'user') {
          messages.push({ role: 'user', content: msg.content });
        } else if (msg.role === 'assistant') {
          if (msg.toolCalls && msg.toolCalls.length > 0) {
            const toolCallObjs = msg.toolCalls.map(tc => ({
              id: tc.id,
              type: 'function' as const,
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.input),
              },
            }));
            messages.push({
              role: 'assistant',
              content: msg.content || null,
              tool_calls: toolCallObjs,
            });
            for (const tc of msg.toolCalls) {
              if (tc.result !== undefined) {
                messages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: tc.result,
                });
              }
            }
          } else {
            messages.push({ role: 'assistant', content: msg.content });
          }
        }
      }
    }

    // Current user message
    let userContent = prompt;
    if (images && images.length > 0) {
      userContent += '\n\n[Note: Image attachments are present but not supported in Copilot mode]';
    }
    messages.push({ role: 'user', content: userContent });

    return messages;
  }
}
