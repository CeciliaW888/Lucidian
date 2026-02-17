/**
 * GitHub Copilot Chat Completions API client.
 *
 * Streams SSE responses from the Copilot API (OpenAI-compatible format).
 * Supports function calling (tool_calls) for agentic workflows.
 */

const COPILOT_CHAT_URL = 'https://api.githubcopilot.com/chat/completions';
const COPILOT_MODELS_URL = 'https://api.githubcopilot.com/models';

export interface CopilotApiModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface CopilotChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: CopilotToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface CopilotToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface CopilotToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface StreamDelta {
  role?: string;
  content?: string | null;
  tool_calls?: Array<{
    index: number;
    id?: string;
    type?: string;
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
}

export interface StreamChoice {
  index: number;
  delta: StreamDelta;
  finish_reason: string | null;
}

export interface StreamChunkSSE {
  id: string;
  choices: StreamChoice[];
}

/**
 * Streams chat completions from the GitHub Copilot API.
 * Yields parsed SSE chunks as they arrive.
 */
export async function* streamChat(
  token: string,
  messages: CopilotChatMessage[],
  model: string,
  tools?: CopilotToolDefinition[],
  signal?: AbortSignal,
): AsyncGenerator<StreamChunkSSE> {
  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
    temperature: 0.1,
    top_p: 1,
    n: 1,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const response = await fetch(COPILOT_CHAT_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'editor-version': 'vscode/1.95.0',
      'editor-plugin-version': 'copilot/1.0.0',
      'openai-intent': 'conversation-panel',
      'copilot-integration-id': 'vscode-chat',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Copilot API error ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const chunk: StreamChunkSSE = JSON.parse(trimmed.slice(6));
          yield chunk;
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Non-streaming chat completion (fallback).
 */
export async function sendChat(
  token: string,
  messages: CopilotChatMessage[],
  model: string,
  tools?: CopilotToolDefinition[],
): Promise<CopilotChatMessage> {
  const body: Record<string, unknown> = {
    model,
    messages,
    stream: false,
    temperature: 0.1,
    top_p: 1,
    n: 1,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const response = await fetch(COPILOT_CHAT_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'editor-version': 'vscode/1.95.0',
      'editor-plugin-version': 'copilot/1.0.0',
      'openai-intent': 'conversation-panel',
      'copilot-integration-id': 'vscode-chat',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Copilot API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice?.message) throw new Error('No response from Copilot API');

  return choice.message;
}

export async function fetchModels(token: string): Promise<CopilotApiModel[]> {
  const response = await fetch(COPILOT_MODELS_URL, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'editor-version': 'vscode/1.95.0',
      'editor-plugin-version': 'copilot/1.0.0',
      'copilot-integration-id': 'vscode-chat',
    },
  });

  if (!response.ok) {
    throw new Error(`Copilot models API error ${response.status}`);
  }

  const data = await response.json();
  return data.data ?? [];
}
