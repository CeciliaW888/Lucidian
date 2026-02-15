import { ItemView, WorkspaceLeaf, Component, setIcon } from "obsidian";
import { ChatState, Conversation } from "./state/ChatState";
import { MessageRenderer } from "./rendering/MessageRenderer";
import { StreamController } from "./controllers/StreamController";
import { InputController } from "./controllers/InputController";
import { AgentLoop } from "../../core/agent/AgentLoop";
import { ModelOption, AVAILABLE_MODELS, DEFAULT_MODEL } from "../../core/api/models";
import type CopilotAgentPlugin from "../../main";

export const VIEW_TYPE = "copilot-agent-chat";

export class ChatView extends ItemView {
	private plugin: CopilotAgentPlugin;
	private state: ChatState;
	private renderer: MessageRenderer;
	private streamController: StreamController;
	private inputController: InputController;
	private agentLoop: AgentLoop | null = null;
	private selectedModel: ModelOption = DEFAULT_MODEL;
	private conversationId: string;

	// DOM refs
	private headerEl: HTMLElement;
	private messagesScroll: HTMLElement;
	private messagesContainer: HTMLElement;
	private scrollToBottomBtn: HTMLElement;
	private inputContainer: HTMLElement;
	private modelSelectorEl: HTMLElement;
	private emptyStateEl: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: CopilotAgentPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.conversationId = `conv_${Date.now()}`;
		this.state = new ChatState();
		this.renderer = new MessageRenderer(this);
	}

	getViewType(): string {
		return VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Copilot Agent";
	}

	getIcon(): string {
		return "bot";
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("ca-root");

		this.buildHeader(container);
		this.buildMessagesArea(container);
		this.buildInputArea(container);
		this.setupStateCallbacks();
		this.showEmptyState();
	}

	async onClose(): Promise<void> {
		this.agentLoop?.cancel();
	}

	private buildHeader(container: HTMLElement): void {
		this.headerEl = container.createDiv({ cls: "ca-header" });

		const titleSlot = this.headerEl.createDiv({ cls: "ca-header-title" });
		const iconEl = titleSlot.createSpan({ cls: "ca-header-icon" });
		setIcon(iconEl, "bot");
		titleSlot.createSpan({ cls: "ca-header-text", text: "Copilot Agent" });

		const actions = this.headerEl.createDiv({ cls: "ca-header-actions" });

		// Model selector
		this.modelSelectorEl = actions.createDiv({ cls: "ca-model-selector" });
		this.buildModelSelector();

		// New chat button
		const newChatBtn = actions.createDiv({ cls: "ca-header-btn", attr: { "aria-label": "New conversation" } });
		setIcon(newChatBtn, "plus");
		newChatBtn.addEventListener("click", () => this.newConversation());
	}

	private buildModelSelector(): void {
		this.modelSelectorEl.empty();
		const btn = this.modelSelectorEl.createEl("button", {
			cls: "ca-model-btn",
			text: this.selectedModel.name,
		});

		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.showModelDropdown(btn);
		});
	}

	private showModelDropdown(anchor: HTMLElement): void {
		const existing = this.containerEl.querySelector(".ca-dropdown");
		if (existing) { existing.remove(); return; }

		const dropdown = this.containerEl.createDiv({ cls: "ca-dropdown" });
		const rect = anchor.getBoundingClientRect();
		const containerRect = this.containerEl.getBoundingClientRect();
		dropdown.style.top = (rect.bottom - containerRect.top + 4) + "px";
		dropdown.style.right = (containerRect.right - rect.right) + "px";

		for (const model of AVAILABLE_MODELS) {
			const item = dropdown.createDiv({
				cls: `ca-dropdown-item ${model.id === this.selectedModel.id ? "ca-dropdown-active" : ""}`,
			});
			item.createSpan({ cls: "ca-dropdown-label", text: model.name });
			item.createSpan({ cls: "ca-dropdown-meta", text: model.provider });

			item.addEventListener("click", () => {
				this.selectedModel = model;
				this.agentLoop?.setModel(model.id);
				this.buildModelSelector();
				dropdown.remove();
			});
		}

		// Close on outside click
		const close = (e: MouseEvent) => {
			if (!dropdown.contains(e.target as Node)) {
				dropdown.remove();
				document.removeEventListener("click", close);
			}
		};
		setTimeout(() => document.addEventListener("click", close), 0);
	}

	private buildMessagesArea(container: HTMLElement): void {
		const messagesWrapper = container.createDiv({ cls: "ca-messages-wrapper" });
		this.messagesScroll = messagesWrapper.createDiv({ cls: "ca-messages-scroll" });
		this.messagesContainer = this.messagesScroll.createDiv({ cls: "ca-messages" });

		// Scroll to bottom button
		this.scrollToBottomBtn = messagesWrapper.createDiv({ cls: "ca-scroll-bottom-btn" });
		this.scrollToBottomBtn.style.display = "none";
		setIcon(this.scrollToBottomBtn, "arrow-down");
		this.scrollToBottomBtn.addEventListener("click", () => {
			this.messagesScroll.scrollTop = this.messagesScroll.scrollHeight;
			this.streamController?.setAutoScroll(true);
			this.scrollToBottomBtn.style.display = "none";
		});

		// Detect user scroll
		this.messagesScroll.addEventListener("scroll", () => {
			const { scrollTop, scrollHeight, clientHeight } = this.messagesScroll;
			const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
			if (!nearBottom && this.state.isStreaming) {
				this.streamController?.setAutoScroll(false);
				this.scrollToBottomBtn.style.display = "flex";
			} else if (nearBottom) {
				this.scrollToBottomBtn.style.display = "none";
			}
		});

		this.streamController = new StreamController(this.state, this.renderer, this.messagesContainer);
	}

	private buildInputArea(container: HTMLElement): void {
		this.inputContainer = container.createDiv({ cls: "ca-input-container" });
		this.inputController = new InputController(this.inputContainer, {
			onSend: (msg) => this.handleSend(msg),
			onCancel: () => this.handleCancel(),
		});
	}

	private setupStateCallbacks(): void {
		this.state.setCallbacks({
			onStreamingChanged: (streaming) => {
				this.inputController.setStreaming(streaming);
			},
		});
	}

	private showEmptyState(): void {
		this.emptyStateEl = this.messagesContainer.createDiv({ cls: "ca-empty-state" });
		const icon = this.emptyStateEl.createDiv({ cls: "ca-empty-icon" });
		setIcon(icon, "bot");
		this.emptyStateEl.createDiv({ cls: "ca-empty-title", text: "Copilot Agent" });
		this.emptyStateEl.createDiv({
			cls: "ca-empty-subtitle",
			text: "AI assistant with full vault access. Read, write, search, and run commands.",
		});
	}

	private hideEmptyState(): void {
		if (this.emptyStateEl) {
			this.emptyStateEl.remove();
			this.emptyStateEl = null;
		}
	}

	private ensureAgentLoop(): AgentLoop {
		if (!this.agentLoop) {
			const pat = this.plugin.settings.pat;
			if (!pat) throw new Error("Not authenticated. Please sign in via Settings.");

			const vaultPath = (this.app.vault.adapter as any).basePath;
			this.agentLoop = new AgentLoop(this.app, vaultPath, pat, this.selectedModel.id);
		}
		return this.agentLoop;
	}

	private async handleSend(message: string): Promise<void> {
		this.hideEmptyState();

		// Render user message
		this.renderer.renderUserMessage(this.messagesContainer, {
			id: `msg_${Date.now()}`,
			role: "user",
			content: message,
			timestamp: Date.now(),
		});

		// Scroll to bottom
		this.messagesScroll.scrollTop = this.messagesScroll.scrollHeight;

		try {
			const agent = this.ensureAgentLoop();
			this.streamController.beginResponse();
			const callbacks = this.streamController.createCallbacks();
			await agent.send(message, callbacks);
		} catch (err) {
			this.streamController.endResponse();
			const errorEl = this.messagesContainer.createDiv({ cls: "ca-error-message" });
			errorEl.createSpan({ text: `Error: ${err instanceof Error ? err.message : String(err)}` });
		}

		this.inputController.focus();
	}

	private handleCancel(): void {
		this.agentLoop?.cancel();
		this.streamController.endResponse();
	}

	private newConversation(): void {
		this.agentLoop?.cancel();
		this.agentLoop?.clearHistory();
		this.agentLoop = null;
		this.state.clear();
		this.messagesContainer.empty();
		this.conversationId = `conv_${Date.now()}`;
		this.showEmptyState();
		this.inputController.focus();
	}
}
