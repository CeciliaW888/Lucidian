import { requestUrl } from "obsidian";

const COPILOT_CHAT_URL = "https://api.githubcopilot.com/chat/completions";

export interface ChatMessage {
	role: "system" | "user" | "assistant" | "tool";
	content: string | null;
	tool_calls?: ToolCall[];
	tool_call_id?: string;
	name?: string;
}

export interface ToolCall {
	id: string;
	type: "function";
	function: {
		name: string;
		arguments: string;
	};
}

export interface ToolDefinition {
	type: "function";
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

export interface StreamChunk {
	id: string;
	choices: StreamChoice[];
}

export async function* streamChat(
	token: string,
	messages: ChatMessage[],
	model: string,
	tools?: ToolDefinition[],
	signal?: AbortSignal,
): AsyncGenerator<StreamChunk> {
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
		body.tool_choice = "auto";
	}

	const resp = await requestUrl({
		url: COPILOT_CHAT_URL,
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			"editor-version": "vscode/1.95.0",
			"editor-plugin-version": "copilot/1.0.0",
			"Copilot-Integration-Id": "vscode-chat",
		},
		body: JSON.stringify(body),
	});

	if (signal?.aborted) return;

	// requestUrl returns the full response; parse SSE lines
	const text = resp.text;
	const lines = text.split("\n");
	for (const line of lines) {
		if (signal?.aborted) return;
		const trimmed = line.trim();
		if (!trimmed.startsWith("data: ")) continue;
		const data = trimmed.slice(6);
		if (data === "[DONE]") return;
		try {
			yield JSON.parse(data);
		} catch {
			// Skip malformed chunks
		}
	}
}

// Non-streaming fallback
export async function sendChat(
	token: string,
	messages: ChatMessage[],
	model: string,
	tools?: ToolDefinition[],
): Promise<ChatMessage> {
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
		body.tool_choice = "auto";
	}

	const resp = await requestUrl({
		url: COPILOT_CHAT_URL,
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			"editor-version": "vscode/1.95.0",
			"editor-plugin-version": "copilot/1.0.0",
			"Copilot-Integration-Id": "vscode-chat",
		},
		body: JSON.stringify(body),
	});

	const data = JSON.parse(resp.text);
	const choice = data.choices?.[0];
	if (!choice) throw new Error("No response from Copilot API");

	const msg: ChatMessage = {
		role: "assistant",
		content: choice.message.content,
	};
	if (choice.message.tool_calls) {
		msg.tool_calls = choice.message.tool_calls;
	}
	return msg;
}
