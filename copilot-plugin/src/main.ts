import { Plugin, WorkspaceLeaf } from "obsidian";
import { ChatView, VIEW_TYPE } from "./features/chat/ChatView";
import { CopilotAgentSettingTab, CopilotAgentSettings, DEFAULT_SETTINGS } from "./settings/SettingsTab";

export default class CopilotAgentPlugin extends Plugin {
	settings: CopilotAgentSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(VIEW_TYPE, (leaf) => new ChatView(leaf, this));

		this.addSettingTab(new CopilotAgentSettingTab(this.app, this));

		this.addRibbonIcon("bot", "Open Copilot Agent", () => {
			this.activateView();
		});

		this.addCommand({
			id: "open-copilot-agent",
			name: "Open Copilot Agent chat",
			callback: () => {
				this.activateView();
			},
		});
	}

	async onunload(): Promise<void> {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE);
		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				leaf = rightLeaf;
				await leaf.setViewState({ type: VIEW_TYPE, active: true });
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}
}
