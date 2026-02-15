import { AgentCallbacks } from "../../../core/agent/AgentLoop";
import { ChatState } from "../state/ChatState";
import { MessageRenderer } from "../rendering/MessageRenderer";
import { ToolResult } from "../../../core/tools/executor";

export class StreamController {
	private state: ChatState;
	private renderer: MessageRenderer;
	private messagesContainer: HTMLElement;
	private autoScroll = true;
	private fullText = "";

	constructor(state: ChatState, renderer: MessageRenderer, messagesContainer: HTMLElement) {
		this.state = state;
		this.renderer = renderer;
		this.messagesContainer = messagesContainer;
	}

	createCallbacks(): AgentCallbacks {
		return {
			onTextDelta: (text) => this.handleTextDelta(text),
			onTextDone: (fullText) => this.handleTextDone(fullText),
			onToolCallStart: (id, name) => this.handleToolCallStart(id, name),
			onToolCallInput: (id, partialArgs) => this.handleToolCallInput(id, partialArgs),
			onToolCallComplete: (id, name, input, result) => this.handleToolCallComplete(id, name, input, result),
			onError: (error) => this.handleError(error),
			onDone: () => this.handleDone(),
		};
	}

	beginResponse(): void {
		this.fullText = "";
		this.state.setStreaming(true);
		this.autoScroll = true;

		const { wrapper, contentEl } = this.renderer.createStreamingAssistantMessage(this.messagesContainer);
		this.state.currentAssistantEl = wrapper;
		this.state.currentTextEl = null;
		// Store contentEl for text block creation
		(wrapper as any).__contentEl = contentEl;
		this.scrollToBottom();
	}

	endResponse(): void {
		const wrapper = this.state.currentAssistantEl;
		if (wrapper) {
			wrapper.removeClass("ca-streaming");
		}
		this.state.setStreaming(false);
		this.state.currentAssistantEl = null;
		this.state.currentTextEl = null;
		this.state.toolCallElements.clear();
	}

	setAutoScroll(enabled: boolean): void {
		this.autoScroll = enabled;
	}

	private handleTextDelta(text: string): void {
		const wrapper = this.state.currentAssistantEl;
		if (!wrapper) return;

		// Create text element on first text chunk
		if (!this.state.currentTextEl) {
			const contentEl = (wrapper as any).__contentEl as HTMLElement;
			if (contentEl) {
				this.state.currentTextEl = this.renderer.createStreamingTextEl(contentEl);
			}
		}

		this.fullText += text;

		// Render markdown incrementally (re-render full text)
		if (this.state.currentTextEl) {
			this.renderer.renderMarkdown(this.state.currentTextEl, this.fullText);
		}

		if (this.autoScroll) this.scrollToBottom();
	}

	private handleTextDone(_fullText: string): void {
		// Final render already happened via delta; just persist
		this.state.addAssistantMessage(this.fullText);
	}

	private handleToolCallStart(id: string, name: string): void {
		const wrapper = this.state.currentAssistantEl;
		if (!wrapper) return;

		// If we had text streaming, finalize it and start fresh for next text after tools
		this.state.currentTextEl = null;

		const el = this.renderer.renderStreamingToolCall(wrapper, id, name);
		this.state.toolCallElements.set(id, el);

		this.state.addToolCallToLast({ id, name, input: {}, status: "running" });

		if (this.autoScroll) this.scrollToBottom();
	}

	private handleToolCallInput(_id: string, _partialArgs: string): void {
		// Could show args building up; for now just scroll
		if (this.autoScroll) this.scrollToBottom();
	}

	private handleToolCallComplete(
		id: string,
		name: string,
		input: Record<string, unknown>,
		result: ToolResult,
	): void {
		const el = this.state.toolCallElements.get(id);
		if (el) {
			this.renderer.finalizeStreamingToolCall(el, id, name, input, result);
		}

		this.state.updateToolCallStatus(id, result.isError ? "error" : "completed", result);

		if (this.autoScroll) this.scrollToBottom();
	}

	private handleError(error: Error): void {
		const wrapper = this.state.currentAssistantEl;
		if (wrapper) {
			const errorEl = wrapper.createDiv({ cls: "ca-error-message" });
			errorEl.createSpan({ text: `Error: ${error.message}` });
		}
		this.endResponse();
	}

	private handleDone(): void {
		this.fullText = "";
		this.endResponse();
	}

	private scrollToBottom(): void {
		const scrollParent = this.messagesContainer.parentElement;
		if (scrollParent) {
			scrollParent.scrollTop = scrollParent.scrollHeight;
		}
	}
}
