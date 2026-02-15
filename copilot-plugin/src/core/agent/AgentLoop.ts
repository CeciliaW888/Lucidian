import { App } from "obsidian";
import { ChatMessage, ToolCall, streamChat, sendChat } from "../api/client";
import { TOOL_DEFINITIONS } from "../tools/definitions";
import { ToolExecutor, ToolResult } from "../tools/executor";
import { CopilotToken, fetchCopilotToken, isTokenExpired } from "../api/auth";

const SYSTEM_PROMPT = `You are Copilot Agent, an AI assistant embedded in Obsidian with full access to the user's vault. You can read, write, and edit files, run bash commands, search for content, and explore the file system.

Key behaviors:
- Read files before modifying them. Understand existing code/content before making changes.
- Use edit_file for targeted changes to existing files. Use write_file only for new files or full rewrites.
- When searching for code, use grep with appropriate patterns. Use glob to discover file structure.
- For bash commands, use appropriate tools (git, npm, etc.) and keep commands focused.
- Be concise in your responses. Show your work through tool use, not lengthy explanations.
- If a task requires multiple steps, execute them sequentially using the tools available.
- Always operate within the vault directory. Never access files outside the vault.`;

const MAX_TOOL_ROUNDS = 25;

export interface AgentCallbacks {
	onTextDelta: (text: string) => void;
	onTextDone: (fullText: string) => void;
	onToolCallStart: (id: string, name: string) => void;
	onToolCallInput: (id: string, partialArgs: string) => void;
	onToolCallComplete: (id: string, name: string, input: Record<string, unknown>, result: ToolResult) => void;
	onError: (error: Error) => void;
	onDone: () => void;
}

export class AgentLoop {
	private executor: ToolExecutor;
	private messages: ChatMessage[] = [];
	private abortController: AbortController | null = null;
	private pat: string;
	private token: CopilotToken | null = null;
	private model: string;

	constructor(
		app: App,
		vaultPath: string,
		pat: string,
		model: string,
	) {
		this.executor = new ToolExecutor(app, vaultPath);
		this.pat = pat;
		this.model = model;
		this.messages = [{ role: "system", content: SYSTEM_PROMPT }];
	}

	setModel(model: string): void {
		this.model = model;
	}

	getMessages(): ChatMessage[] {
		return [...this.messages];
	}

	cancel(): void {
		this.abortController?.abort();
	}

	private async ensureToken(): Promise<string> {
		if (!this.token || isTokenExpired(this.token.expiresAt)) {
			this.token = await fetchCopilotToken(this.pat);
		}
		return this.token.token;
	}

	async send(userMessage: string, callbacks: AgentCallbacks): Promise<void> {
		this.abortController = new AbortController();
		const signal = this.abortController.signal;

		this.messages.push({ role: "user", content: userMessage });

		let rounds = 0;
		try {
			const token = await this.ensureToken();

			while (rounds < MAX_TOOL_ROUNDS) {
				if (signal.aborted) return;
				rounds++;

				const assistantMessage = await this.processRound(token, callbacks, signal);
				if (!assistantMessage) return;

				// If no tool calls, we're done
				if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
					callbacks.onDone();
					return;
				}

				// Execute tool calls and continue the loop
				const toolResults = await this.executeToolCalls(assistantMessage.tool_calls, callbacks, signal);
				if (signal.aborted) return;

				for (const result of toolResults) {
					this.messages.push(result);
				}
			}

			// Exceeded max rounds
			callbacks.onTextDelta("\n\n*Reached maximum tool use rounds. Please continue the conversation to proceed.*");
			callbacks.onDone();
		} catch (err) {
			if (!signal.aborted) {
				callbacks.onError(err instanceof Error ? err : new Error(String(err)));
			}
		}
	}

	private async processRound(
		token: string,
		callbacks: AgentCallbacks,
		signal: AbortSignal,
	): Promise<ChatMessage | null> {
		let fullText = "";
		const toolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map();

		try {
			// Try streaming first
			for await (const chunk of streamChat(token, this.messages, this.model, TOOL_DEFINITIONS, signal)) {
				if (signal.aborted) return null;

				for (const choice of chunk.choices) {
					const delta = choice.delta;

					// Text content
					if (delta.content) {
						fullText += delta.content;
						callbacks.onTextDelta(delta.content);
					}

					// Tool calls (streamed incrementally)
					if (delta.tool_calls) {
						for (const tc of delta.tool_calls) {
							if (!toolCalls.has(tc.index)) {
								toolCalls.set(tc.index, { id: tc.id ?? "", name: "", arguments: "" });
							}
							const existing = toolCalls.get(tc.index)!;
							if (tc.id) existing.id = tc.id;
							if (tc.function?.name) {
								existing.name = tc.function.name;
								callbacks.onToolCallStart(existing.id, existing.name);
							}
							if (tc.function?.arguments) {
								existing.arguments += tc.function.arguments;
								callbacks.onToolCallInput(existing.id, existing.arguments);
							}
						}
					}
				}
			}
		} catch {
			// Streaming failed — fallback to non-streaming
			const response = await sendChat(token, this.messages, this.model, TOOL_DEFINITIONS);
			if (response.content) {
				fullText = response.content;
				callbacks.onTextDelta(fullText);
			}
			if (response.tool_calls) {
				for (let i = 0; i < response.tool_calls.length; i++) {
					const tc = response.tool_calls[i];
					toolCalls.set(i, {
						id: tc.id,
						name: tc.function.name,
						arguments: tc.function.arguments,
					});
					callbacks.onToolCallStart(tc.id, tc.function.name);
					callbacks.onToolCallInput(tc.id, tc.function.arguments);
				}
			}
		}

		if (fullText) {
			callbacks.onTextDone(fullText);
		}

		// Build assistant message for history
		const assistantMsg: ChatMessage = {
			role: "assistant",
			content: fullText || null,
		};
		if (toolCalls.size > 0) {
			assistantMsg.tool_calls = Array.from(toolCalls.values()).map((tc) => ({
				id: tc.id,
				type: "function" as const,
				function: { name: tc.name, arguments: tc.arguments },
			}));
		}
		this.messages.push(assistantMsg);
		return assistantMsg;
	}

	private async executeToolCalls(
		toolCalls: ToolCall[],
		callbacks: AgentCallbacks,
		signal: AbortSignal,
	): Promise<ChatMessage[]> {
		const results: ChatMessage[] = [];

		for (const tc of toolCalls) {
			if (signal.aborted) break;

			let input: Record<string, unknown>;
			try {
				input = JSON.parse(tc.function.arguments);
			} catch {
				input = {};
			}

			const result = await this.executor.execute(tc.function.name, input);
			callbacks.onToolCallComplete(tc.id, tc.function.name, input, result);

			results.push({
				role: "tool",
				tool_call_id: tc.id,
				content: result.content,
			});
		}

		return results;
	}

	clearHistory(): void {
		this.messages = [{ role: "system", content: SYSTEM_PROMPT }];
	}
}
