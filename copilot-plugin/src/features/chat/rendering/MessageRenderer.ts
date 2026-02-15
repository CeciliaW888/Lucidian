import { MarkdownRenderer, Component, ItemView } from "obsidian";
import { StoredMessage, StoredToolCall } from "../state/ChatState";
import { ToolCallRenderer } from "./ToolCallRenderer";

export class MessageRenderer {
	private view: ItemView;
	private toolCallRenderer: ToolCallRenderer;

	constructor(view: ItemView) {
		this.view = view;
		this.toolCallRenderer = new ToolCallRenderer();
	}

	renderUserMessage(container: HTMLElement, message: StoredMessage): HTMLElement {
		const wrapper = container.createDiv({ cls: "ca-message ca-message-user" });
		const bubble = wrapper.createDiv({ cls: "ca-message-bubble ca-user-bubble" });
		bubble.createDiv({ cls: "ca-message-content", text: message.content });
		return wrapper;
	}

	renderAssistantMessage(container: HTMLElement, message: StoredMessage): HTMLElement {
		const wrapper = container.createDiv({ cls: "ca-message ca-message-assistant" });

		if (message.content) {
			const contentEl = wrapper.createDiv({ cls: "ca-message-content ca-assistant-content" });
			this.renderMarkdown(contentEl, message.content);
		}

		if (message.toolCalls) {
			for (const tc of message.toolCalls) {
				this.toolCallRenderer.renderStoredToolCall(wrapper, tc);
			}
		}

		return wrapper;
	}

	// Creates a live assistant message container for streaming
	createStreamingAssistantMessage(container: HTMLElement): {
		wrapper: HTMLElement;
		contentEl: HTMLElement;
	} {
		const wrapper = container.createDiv({ cls: "ca-message ca-message-assistant ca-streaming" });
		const contentEl = wrapper.createDiv({ cls: "ca-message-content ca-assistant-content" });
		return { wrapper, contentEl };
	}

	createStreamingTextEl(contentEl: HTMLElement): HTMLElement {
		return contentEl.createDiv({ cls: "ca-text-block" });
	}

	renderStreamingToolCall(wrapper: HTMLElement, id: string, name: string): HTMLElement {
		return this.toolCallRenderer.renderStreamingToolCall(wrapper, id, name);
	}

	finalizeStreamingToolCall(
		el: HTMLElement,
		id: string,
		name: string,
		input: Record<string, unknown>,
		result: { content: string; isError: boolean },
	): void {
		this.toolCallRenderer.finalizeToolCall(el, name, input, result);
	}

	async renderMarkdown(el: HTMLElement, markdown: string): Promise<void> {
		el.empty();
		await MarkdownRenderer.render(this.view.app, markdown, el, "", this.view);

		// Add copy buttons to code blocks
		el.querySelectorAll("pre > code").forEach((codeBlock) => {
			const pre = codeBlock.parentElement;
			if (!pre) return;
			pre.addClass("ca-code-block");

			const copyBtn = pre.createEl("button", { cls: "ca-copy-btn", text: "Copy" });
			copyBtn.addEventListener("click", () => {
				navigator.clipboard.writeText(codeBlock.textContent ?? "");
				copyBtn.textContent = "Copied!";
				setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
			});
		});
	}

	renderFullConversation(container: HTMLElement, messages: StoredMessage[]): void {
		container.empty();
		for (const msg of messages) {
			if (msg.role === "user") {
				this.renderUserMessage(container, msg);
			} else {
				this.renderAssistantMessage(container, msg);
			}
		}
	}
}
