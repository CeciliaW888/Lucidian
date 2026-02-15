import { App, TFile, TFolder, normalizePath } from "obsidian";
import { TOOL_NAMES, ToolName } from "./definitions";
import { exec } from "child_process";
import * as path from "path";
import * as fs from "fs";

export interface ToolResult {
	content: string;
	isError: boolean;
}

export class ToolExecutor {
	constructor(
		private app: App,
		private vaultPath: string,
	) {}

	async execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
		try {
			switch (toolName as ToolName) {
				case TOOL_NAMES.READ:
					return await this.readFile(args);
				case TOOL_NAMES.WRITE:
					return await this.writeFile(args);
				case TOOL_NAMES.EDIT:
					return await this.editFile(args);
				case TOOL_NAMES.BASH:
					return await this.bash(args);
				case TOOL_NAMES.GREP:
					return await this.grep(args);
				case TOOL_NAMES.GLOB:
					return await this.glob(args);
				case TOOL_NAMES.LS:
					return await this.ls(args);
				default:
					return { content: `Unknown tool: ${toolName}`, isError: true };
			}
		} catch (err) {
			return { content: `Error: ${err instanceof Error ? err.message : String(err)}`, isError: true };
		}
	}

	private resolvePath(relativePath: string): string {
		const resolved = path.resolve(this.vaultPath, relativePath);
		// Prevent path traversal
		if (!resolved.startsWith(this.vaultPath)) {
			throw new Error("Path traversal not allowed: path must be within the vault");
		}
		return resolved;
	}

	private async readFile(args: Record<string, unknown>): Promise<ToolResult> {
		const filePath = String(args.file_path);
		const absPath = this.resolvePath(filePath);
		const offset = typeof args.offset === "number" ? args.offset : 1;
		const limit = typeof args.limit === "number" ? args.limit : 2000;

		const content = fs.readFileSync(absPath, "utf-8");
		const lines = content.split("\n");
		const startIdx = Math.max(0, offset - 1);
		const selected = lines.slice(startIdx, startIdx + limit);

		const numbered = selected.map((line, i) => `${startIdx + i + 1}\t${line}`).join("\n");
		return { content: numbered, isError: false };
	}

	private async writeFile(args: Record<string, unknown>): Promise<ToolResult> {
		const filePath = String(args.file_path);
		const content = String(args.content);
		const absPath = this.resolvePath(filePath);

		const dir = path.dirname(absPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.writeFileSync(absPath, content, "utf-8");

		const lineCount = content.split("\n").length;
		return { content: `Wrote ${lineCount} lines to ${filePath}`, isError: false };
	}

	private async editFile(args: Record<string, unknown>): Promise<ToolResult> {
		const filePath = String(args.file_path);
		const oldString = String(args.old_string);
		const newString = String(args.new_string);
		const absPath = this.resolvePath(filePath);

		let content = fs.readFileSync(absPath, "utf-8");
		const occurrences = content.split(oldString).length - 1;
		if (occurrences === 0) {
			return { content: `old_string not found in ${filePath}`, isError: true };
		}
		if (occurrences > 1) {
			return {
				content: `old_string found ${occurrences} times in ${filePath} — must be unique. Provide more surrounding context.`,
				isError: true,
			};
		}

		content = content.replace(oldString, newString);
		fs.writeFileSync(absPath, content, "utf-8");
		return { content: `Edited ${filePath} successfully`, isError: false };
	}

	private async bash(args: Record<string, unknown>): Promise<ToolResult> {
		const command = String(args.command);

		// Block dangerous commands
		const blocklist = ["rm -rf /", "rm -rf ~", "mkfs", "dd if=", ":(){:|:&};:"];
		for (const blocked of blocklist) {
			if (command.includes(blocked)) {
				return { content: `Blocked dangerous command: ${blocked}`, isError: true };
			}
		}

		return new Promise((resolve) => {
			const child = exec(command, {
				cwd: this.vaultPath,
				timeout: 30000,
				maxBuffer: 1024 * 1024,
				env: { ...process.env, HOME: process.env.HOME },
			}, (error, stdout, stderr) => {
				if (error && error.killed) {
					resolve({ content: "Command timed out after 30 seconds", isError: true });
					return;
				}
				const output = [
					stdout ? stdout.trimEnd() : "",
					stderr ? `STDERR:\n${stderr.trimEnd()}` : "",
				].filter(Boolean).join("\n");

				resolve({
					content: output || "(no output)",
					isError: !!error,
				});
			});
		});
	}

	private async grep(args: Record<string, unknown>): Promise<ToolResult> {
		const pattern = String(args.pattern);
		const searchPath = args.path ? String(args.path) : ".";
		const include = args.include ? String(args.include) : "";
		const contextLines = typeof args.context_lines === "number" ? args.context_lines : 0;

		const absPath = this.resolvePath(searchPath);
		let cmd = `grep -rn --color=never`;
		if (include) cmd += ` --include="${include}"`;
		if (contextLines > 0) cmd += ` -C ${contextLines}`;
		cmd += ` -E "${pattern.replace(/"/g, '\\"')}" "${absPath}"`;

		return new Promise((resolve) => {
			exec(cmd, { cwd: this.vaultPath, timeout: 15000, maxBuffer: 1024 * 512 }, (error, stdout) => {
				if (!stdout.trim()) {
					resolve({ content: "No matches found", isError: false });
					return;
				}
				// Make paths relative
				const output = stdout.replace(new RegExp(this.vaultPath + "/", "g"), "");
				const lines = output.trim().split("\n");
				const truncated = lines.length > 200 ? lines.slice(0, 200).join("\n") + `\n... (${lines.length - 200} more lines)` : lines.join("\n");
				resolve({ content: truncated, isError: false });
			});
		});
	}

	private async glob(args: Record<string, unknown>): Promise<ToolResult> {
		const pattern = String(args.pattern);
		const searchPath = args.path ? String(args.path) : ".";
		const absPath = this.resolvePath(searchPath);

		// Use find + glob pattern matching
		const cmd = `find "${absPath}" -type f -name "${pattern.replace(/\*\*\//g, "")}" 2>/dev/null | head -200`;
		return new Promise((resolve) => {
			exec(cmd, { cwd: this.vaultPath, timeout: 10000, maxBuffer: 1024 * 256 }, (error, stdout) => {
				if (!stdout.trim()) {
					resolve({ content: "No files matched", isError: false });
					return;
				}
				const output = stdout.replace(new RegExp(this.vaultPath + "/", "g"), "");
				resolve({ content: output.trim(), isError: false });
			});
		});
	}

	private async ls(args: Record<string, unknown>): Promise<ToolResult> {
		const dirPath = args.path ? String(args.path) : ".";
		const absPath = this.resolvePath(dirPath);

		const entries = fs.readdirSync(absPath, { withFileTypes: true });
		const lines = entries
			.sort((a, b) => {
				// Directories first
				if (a.isDirectory() && !b.isDirectory()) return -1;
				if (!a.isDirectory() && b.isDirectory()) return 1;
				return a.name.localeCompare(b.name);
			})
			.map((e) => `${e.isDirectory() ? "[dir]  " : "[file] "}${e.name}`);

		return { content: lines.join("\n") || "(empty directory)", isError: false };
	}
}
