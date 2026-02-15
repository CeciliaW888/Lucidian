import { setIcon } from "obsidian";
import { StoredToolCall } from "../state/ChatState";
import { TOOL_NAMES } from "../../../core/tools/definitions";

const TOOL_ICONS: Record<string, string> = {
	[TOOL_NAMES.READ]: "file-text",
	[TOOL_NAMES.WRITE]: "file-plus",
	[TOOL_NAMES.EDIT]: "file-edit",
	[TOOL_NAMES.BASH]: "terminal",
	[TOOL_NAMES.GREP]: "search",
	[TOOL_NAMES.GLOB]: "folder-search",
	[TOOL_NAMES.LS]: "folder-open",
};

const TOOL_LABELS: Record<string, string> = {
	[TOOL_NAMES.READ]: "Read",
	[TOOL_NAMES.WRITE]: "Write",
	[TOOL_NAMES.EDIT]: "Edit",
	[TOOL_NAMES.BASH]: "Bash",
	[TOOL_NAMES.GREP]: "Search",
	[TOOL_NAMES.GLOB]: "Find Files",
	[TOOL_NAMES.LS]: "List Directory",
};

export class ToolCallRenderer {
	renderStoredToolCall(container: HTMLElement, tc: StoredToolCall): HTMLElement {
		const block = container.createDiv({ cls: "ca-tool-call" });
		const header = this.createHeader(block, tc.name, tc.id, tc.status);
		const body = block.createDiv({ cls: "ca-tool-body" });
		body.style.display = "none";

		// Summary in header
		const summary = this.getSummary(tc.name, tc.input);
		if (summary) {
			header.createSpan({ cls: "ca-tool-summary", text: summary });
		}

		// Input display
		this.renderInput(body, tc.name, tc.input);

		// Result display
		if (tc.result) {
			this.renderResult(body, tc.result);
		}

		// Collapse toggle
		header.addEventListener("click", () => {
			const expanded = body.style.display !== "none";
			body.style.display = expanded ? "none" : "block";
			block.toggleClass("ca-expanded", !expanded);
		});

		return block;
	}

	renderStreamingToolCall(container: HTMLElement, id: string, name: string): HTMLElement {
		const block = container.createDiv({ cls: "ca-tool-call ca-tool-running" });
		this.createHeader(block, name, id, "running");

		const body = block.createDiv({ cls: "ca-tool-body" });
		body.style.display = "none";

		const header = block.querySelector(".ca-tool-header") as HTMLElement;
		header?.addEventListener("click", () => {
			const expanded = body.style.display !== "none";
			body.style.display = expanded ? "none" : "block";
			block.toggleClass("ca-expanded", !expanded);
		});

		return block;
	}

	finalizeToolCall(
		block: HTMLElement,
		name: string,
		input: Record<string, unknown>,
		result: { content: string; isError: boolean },
	): void {
		block.removeClass("ca-tool-running");
		block.addClass(result.isError ? "ca-tool-error" : "ca-tool-completed");

		// Update status icon
		const statusEl = block.querySelector(".ca-tool-status") as HTMLElement;
		if (statusEl) {
			statusEl.empty();
			setIcon(statusEl, result.isError ? "x-circle" : "check-circle");
		}

		// Add summary
		const header = block.querySelector(".ca-tool-header") as HTMLElement;
		if (header) {
			const summary = this.getSummary(name, input);
			if (summary && !header.querySelector(".ca-tool-summary")) {
				header.createSpan({ cls: "ca-tool-summary", text: summary });
			}
		}

		// Add input and result to body
		const body = block.querySelector(".ca-tool-body") as HTMLElement;
		if (body) {
			this.renderInput(body, name, input);
			this.renderResult(body, result);
		}
	}

	private createHeader(block: HTMLElement, name: string, id: string, status: string): HTMLElement {
		const header = block.createDiv({ cls: "ca-tool-header" });
		header.setAttribute("role", "button");
		header.setAttribute("aria-expanded", "false");

		const iconEl = header.createSpan({ cls: "ca-tool-icon" });
		setIcon(iconEl, TOOL_ICONS[name] ?? "wrench");

		header.createSpan({ cls: "ca-tool-name", text: TOOL_LABELS[name] ?? name });

		const statusEl = header.createSpan({ cls: `ca-tool-status ca-status-${status}` });
		if (status === "running") {
			setIcon(statusEl, "loader");
		} else if (status === "completed") {
			setIcon(statusEl, "check-circle");
		} else if (status === "error") {
			setIcon(statusEl, "x-circle");
		}

		return header;
	}

	private getSummary(name: string, input: Record<string, unknown>): string {
		switch (name) {
			case TOOL_NAMES.READ:
			case TOOL_NAMES.WRITE:
			case TOOL_NAMES.EDIT:
				return this.truncate(String(input.file_path ?? ""), 60);
			case TOOL_NAMES.BASH:
				return this.truncate(String(input.command ?? ""), 60);
			case TOOL_NAMES.GREP:
				return this.truncate(String(input.pattern ?? ""), 40);
			case TOOL_NAMES.GLOB:
				return this.truncate(String(input.pattern ?? ""), 40);
			case TOOL_NAMES.LS:
				return this.truncate(String(input.path ?? "."), 40);
			default:
				return "";
		}
	}

	private renderInput(body: HTMLElement, name: string, input: Record<string, unknown>): void {
		const inputSection = body.createDiv({ cls: "ca-tool-input" });
		const label = inputSection.createDiv({ cls: "ca-tool-section-label", text: "Input" });

		switch (name) {
			case TOOL_NAMES.READ:
				inputSection.createDiv({ cls: "ca-tool-detail", text: `File: ${input.file_path}` });
				if (input.offset) inputSection.createDiv({ cls: "ca-tool-detail", text: `Offset: ${input.offset}` });
				if (input.limit) inputSection.createDiv({ cls: "ca-tool-detail", text: `Limit: ${input.limit}` });
				break;
			case TOOL_NAMES.WRITE:
				inputSection.createDiv({ cls: "ca-tool-detail", text: `File: ${input.file_path}` });
				break;
			case TOOL_NAMES.EDIT:
				inputSection.createDiv({ cls: "ca-tool-detail", text: `File: ${input.file_path}` });
				break;
			case TOOL_NAMES.BASH:
				inputSection.createEl("pre", { cls: "ca-tool-code", text: String(input.command ?? "") });
				break;
			case TOOL_NAMES.GREP:
				inputSection.createDiv({ cls: "ca-tool-detail", text: `Pattern: ${input.pattern}` });
				if (input.path) inputSection.createDiv({ cls: "ca-tool-detail", text: `Path: ${input.path}` });
				if (input.include) inputSection.createDiv({ cls: "ca-tool-detail", text: `Include: ${input.include}` });
				break;
			case TOOL_NAMES.GLOB:
				inputSection.createDiv({ cls: "ca-tool-detail", text: `Pattern: ${input.pattern}` });
				break;
			case TOOL_NAMES.LS:
				inputSection.createDiv({ cls: "ca-tool-detail", text: `Path: ${input.path ?? "."}` });
				break;
			default:
				inputSection.createEl("pre", { cls: "ca-tool-code", text: JSON.stringify(input, null, 2) });
		}
	}

	private renderResult(body: HTMLElement, result: { content: string; isError: boolean }): void {
		const resultSection = body.createDiv({ cls: "ca-tool-result" });
		resultSection.createDiv({ cls: "ca-tool-section-label", text: result.isError ? "Error" : "Result" });

		const content = result.content;
		const lines = content.split("\n");
		const MAX_LINES = 30;

		if (lines.length > MAX_LINES) {
			resultSection.createEl("pre", {
				cls: `ca-tool-output ${result.isError ? "ca-tool-output-error" : ""}`,
				text: lines.slice(0, MAX_LINES).join("\n"),
			});
			const moreBtn = resultSection.createEl("button", {
				cls: "ca-tool-show-more",
				text: `Show ${lines.length - MAX_LINES} more lines`,
			});
			const fullPre = resultSection.createEl("pre", {
				cls: `ca-tool-output ${result.isError ? "ca-tool-output-error" : ""}`,
				text: content,
			});
			fullPre.style.display = "none";

			moreBtn.addEventListener("click", () => {
				const prev = fullPre.previousElementSibling?.previousElementSibling as HTMLElement;
				if (prev) prev.style.display = "none";
				moreBtn.style.display = "none";
				fullPre.style.display = "block";
			});
		} else {
			resultSection.createEl("pre", {
				cls: `ca-tool-output ${result.isError ? "ca-tool-output-error" : ""}`,
				text: content,
			});
		}
	}

	private truncate(s: string, max: number): string {
		return s.length > max ? s.slice(0, max - 1) + "\u2026" : s;
	}
}
