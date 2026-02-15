import { ToolResult } from "../../../core/tools/executor";

export interface StoredMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: number;
	toolCalls?: StoredToolCall[];
}

export interface StoredToolCall {
	id: string;
	name: string;
	input: Record<string, unknown>;
	result?: ToolResult;
	status: "running" | "completed" | "error";
}

export interface Conversation {
	id: string;
	title: string;
	messages: StoredMessage[];
	model: string;
	createdAt: number;
	updatedAt: number;
}

export interface ChatStateCallbacks {
	onStreamingChanged?: (streaming: boolean) => void;
	onMessageAdded?: (message: StoredMessage) => void;
}

let nextId = 0;
function genId(): string {
	return `msg_${Date.now()}_${++nextId}`;
}

export class ChatState {
	messages: StoredMessage[] = [];
	isStreaming = false;
	private _callbacks: ChatStateCallbacks = {};

	// DOM references for live streaming updates
	currentAssistantEl: HTMLElement | null = null;
	currentTextEl: HTMLElement | null = null;
	toolCallElements: Map<string, HTMLElement> = new Map();

	setCallbacks(callbacks: ChatStateCallbacks): void {
		this._callbacks = callbacks;
	}

	setStreaming(streaming: boolean): void {
		this.isStreaming = streaming;
		this._callbacks.onStreamingChanged?.(streaming);
	}

	addUserMessage(content: string): StoredMessage {
		const msg: StoredMessage = {
			id: genId(),
			role: "user",
			content,
			timestamp: Date.now(),
		};
		this.messages.push(msg);
		this._callbacks.onMessageAdded?.(msg);
		return msg;
	}

	addAssistantMessage(content: string, toolCalls?: StoredToolCall[]): StoredMessage {
		const msg: StoredMessage = {
			id: genId(),
			role: "assistant",
			content,
			timestamp: Date.now(),
			toolCalls,
		};
		this.messages.push(msg);
		this._callbacks.onMessageAdded?.(msg);
		return msg;
	}

	updateLastAssistantContent(content: string): void {
		const last = this.messages[this.messages.length - 1];
		if (last && last.role === "assistant") {
			last.content = content;
		}
	}

	addToolCallToLast(toolCall: StoredToolCall): void {
		const last = this.messages[this.messages.length - 1];
		if (last && last.role === "assistant") {
			if (!last.toolCalls) last.toolCalls = [];
			last.toolCalls.push(toolCall);
		}
	}

	updateToolCallStatus(toolCallId: string, status: "running" | "completed" | "error", result?: ToolResult): void {
		for (let i = this.messages.length - 1; i >= 0; i--) {
			const msg = this.messages[i];
			if (!msg.toolCalls) continue;
			const tc = msg.toolCalls.find((t) => t.id === toolCallId);
			if (tc) {
				tc.status = status;
				if (result) tc.result = result;
				return;
			}
		}
	}

	clear(): void {
		this.messages = [];
		this.isStreaming = false;
		this.currentAssistantEl = null;
		this.currentTextEl = null;
		this.toolCallElements.clear();
	}

	toConversation(id: string, title: string, model: string): Conversation {
		return {
			id,
			title,
			messages: [...this.messages],
			model,
			createdAt: this.messages[0]?.timestamp ?? Date.now(),
			updatedAt: Date.now(),
		};
	}

	loadConversation(conv: Conversation): void {
		this.messages = [...conv.messages];
	}
}
