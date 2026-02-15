import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import { fetchDeviceCode, pollForAccessToken, DeviceCodeResponse } from "../core/api/auth";
import type CopilotAgentPlugin from "../main";

export interface CopilotAgentSettings {
	pat: string;
	selectedModel: string;
	systemPrompt: string;
}

export const DEFAULT_SETTINGS: CopilotAgentSettings = {
	pat: "",
	selectedModel: "gpt-4o-2024-08-06",
	systemPrompt: "",
};

export class CopilotAgentSettingTab extends PluginSettingTab {
	plugin: CopilotAgentPlugin;

	constructor(app: App, plugin: CopilotAgentPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Copilot Agent Settings" });

		// Authentication section
		containerEl.createEl("h3", { text: "Authentication" });

		if (this.plugin.settings.pat) {
			new Setting(containerEl)
				.setName("Status")
				.setDesc("Authenticated with GitHub Copilot")
				.addButton((btn) =>
					btn.setButtonText("Sign out").onClick(async () => {
						this.plugin.settings.pat = "";
						await this.plugin.saveSettings();
						this.display();
					}),
				);
		} else {
			const authDesc = containerEl.createDiv({ cls: "ca-auth-section" });

			new Setting(containerEl)
				.setName("Sign in with GitHub")
				.setDesc("Authenticate with your GitHub Copilot subscription")
				.addButton((btn) =>
					btn
						.setButtonText("Sign in")
						.setCta()
						.onClick(async () => {
							await this.startAuth(authDesc);
						}),
				);
		}

		// Model section
		containerEl.createEl("h3", { text: "Model" });

		new Setting(containerEl)
			.setName("Default model")
			.setDesc("The model to use for chat conversations")
			.addDropdown((dropdown) => {
				const models = [
					"gpt-4o-2024-08-06",
					"gpt-4.1",
					"claude-sonnet-4-5-20250929",
					"claude-sonnet-4-20250514",
					"claude-haiku-4-5-20251001",
					"gemini-2.5-pro",
					"o4-mini-2025-04-16",
				];
				for (const m of models) {
					dropdown.addOption(m, m);
				}
				dropdown.setValue(this.plugin.settings.selectedModel);
				dropdown.onChange(async (value) => {
					this.plugin.settings.selectedModel = value;
					await this.plugin.saveSettings();
				});
			});

		// Advanced section
		containerEl.createEl("h3", { text: "Advanced" });

		new Setting(containerEl)
			.setName("System prompt")
			.setDesc("Custom system prompt prepended to conversations (optional)")
			.addTextArea((text) => {
				text
					.setPlaceholder("Additional instructions for the AI...")
					.setValue(this.plugin.settings.systemPrompt)
					.onChange(async (value) => {
						this.plugin.settings.systemPrompt = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 4;
				text.inputEl.cols = 50;
			});
	}

	private async startAuth(statusEl: HTMLElement): Promise<void> {
		try {
			const deviceCode: DeviceCodeResponse = await fetchDeviceCode();

			statusEl.empty();
			statusEl.createDiv({ cls: "ca-auth-instructions" }).innerHTML = `
				<p>1. Copy this code: <strong>${deviceCode.user_code}</strong></p>
				<p>2. Open <a href="${deviceCode.verification_uri}">${deviceCode.verification_uri}</a> and paste it</p>
				<p>3. Waiting for authorization...</p>
			`;

			// Copy to clipboard
			await navigator.clipboard.writeText(deviceCode.user_code);
			new Notice("Device code copied to clipboard!");

			// Poll for token
			const pat = await pollForAccessToken(
				deviceCode.device_code,
				deviceCode.interval,
				deviceCode.expires_in,
			);

			this.plugin.settings.pat = pat;
			await this.plugin.saveSettings();
			new Notice("Authenticated with GitHub Copilot!");
			this.display();
		} catch (err) {
			new Notice(`Authentication failed: ${err instanceof Error ? err.message : String(err)}`);
		}
	}
}
