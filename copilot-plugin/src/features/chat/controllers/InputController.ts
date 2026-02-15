export interface InputCallbacks {
	onSend: (message: string) => void;
	onCancel: () => void;
}

export class InputController {
	private textarea: HTMLTextAreaElement;
	private sendBtn: HTMLElement;
	private callbacks: InputCallbacks;
	private isStreaming = false;

	constructor(container: HTMLElement, callbacks: InputCallbacks) {
		this.callbacks = callbacks;

		const inputWrapper = container.createDiv({ cls: "ca-input-wrapper" });

		this.textarea = inputWrapper.createEl("textarea", {
			cls: "ca-input",
			attr: {
				placeholder: "Ask anything...",
				rows: "1",
			},
		});

		this.sendBtn = inputWrapper.createDiv({ cls: "ca-send-btn" });
		this.sendBtn.createSpan({ text: "\u2191" }); // Up arrow

		this.setupEvents();
	}

	setStreaming(streaming: boolean): void {
		this.isStreaming = streaming;
		this.sendBtn.toggleClass("ca-cancel-btn", streaming);
		const span = this.sendBtn.querySelector("span");
		if (span) span.textContent = streaming ? "\u25A0" : "\u2191"; // Stop square or up arrow
		this.textarea.disabled = streaming;
	}

	focus(): void {
		this.textarea.focus();
	}

	clear(): void {
		this.textarea.value = "";
		this.autoResize();
	}

	private setupEvents(): void {
		// Auto-resize textarea
		this.textarea.addEventListener("input", () => this.autoResize());

		// Send on Enter (Shift+Enter for newline)
		this.textarea.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				this.handleSend();
			}
			if (e.key === "Escape" && this.isStreaming) {
				this.callbacks.onCancel();
			}
		});

		// Send/Cancel button
		this.sendBtn.addEventListener("click", () => {
			if (this.isStreaming) {
				this.callbacks.onCancel();
			} else {
				this.handleSend();
			}
		});
	}

	private handleSend(): void {
		const text = this.textarea.value.trim();
		if (!text || this.isStreaming) return;
		this.callbacks.onSend(text);
		this.clear();
	}

	private autoResize(): void {
		this.textarea.style.height = "auto";
		const maxHeight = window.innerHeight * 0.4;
		this.textarea.style.height = Math.min(this.textarea.scrollHeight, maxHeight) + "px";
	}
}
