/**
 * Local tool executor for Copilot provider.
 *
 * Unlike Claude SDK (which handles tool execution internally),
 * Copilot requires client-side tool execution. This executor
 * implements the same tools available in Claudian's Claude integration.
 */

import { exec } from 'child_process';
import * as fs from 'fs';
import type { App } from 'obsidian';
import * as path from 'path';

import { COPILOT_TOOL_NAMES } from './tools';

export interface ToolResult {
  content: string;
  isError: boolean;
}

const BLOCKED_COMMANDS = [
  'rm -rf /',
  'rm -rf ~',
  'mkfs',
  'dd if=',
  ':(){ :|:& };:',
];

const BASH_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 1_048_576; // 1 MB

export class CopilotToolExecutor {
  private vaultPath: string;

  constructor(private app: App, vaultPath: string) {
    this.vaultPath = vaultPath;
  }

  async execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (toolName) {
        case COPILOT_TOOL_NAMES.READ:
          return await this.readFile(args);
        case COPILOT_TOOL_NAMES.WRITE:
          return await this.writeFile(args);
        case COPILOT_TOOL_NAMES.EDIT:
          return await this.editFile(args);
        case COPILOT_TOOL_NAMES.BASH:
          return await this.bash(args);
        case COPILOT_TOOL_NAMES.GREP:
          return await this.grep(args);
        case COPILOT_TOOL_NAMES.GLOB:
          return await this.glob(args);
        case COPILOT_TOOL_NAMES.LS:
          return await this.ls(args);
        default:
          return { content: `Unknown tool: ${toolName}`, isError: true };
      }
    } catch (err) {
      return {
        content: `Error: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      };
    }
  }

  private resolvePath(relativePath: string): string {
    const resolved = path.resolve(this.vaultPath, relativePath);
    if (!resolved.startsWith(this.vaultPath)) {
      throw new Error(`Path traversal detected: ${relativePath}`);
    }
    return resolved;
  }

  private async readFile(args: Record<string, unknown>): Promise<ToolResult> {
    const filePath = this.resolvePath(String(args.file_path ?? ''));
    const offset = Number(args.offset ?? 1);
    const limit = Number(args.limit ?? 2000);

    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const start = Math.max(0, offset - 1);
    const end = Math.min(lines.length, start + limit);
    const numbered = lines
      .slice(start, end)
      .map((line: string, i: number) => `${start + i + 1}\t${line}`)
      .join('\n');

    return { content: numbered, isError: false };
  }

  private async writeFile(args: Record<string, unknown>): Promise<ToolResult> {
    const filePath = this.resolvePath(String(args.file_path ?? ''));
    const content = String(args.content ?? '');

    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, content, 'utf-8');

    return { content: `File written: ${args.file_path}`, isError: false };
  }

  private async editFile(args: Record<string, unknown>): Promise<ToolResult> {
    const filePath = this.resolvePath(String(args.file_path ?? ''));
    const oldString = String(args.old_string ?? '');
    const newString = String(args.new_string ?? '');

    const content = await fs.promises.readFile(filePath, 'utf-8');
    const occurrences = content.split(oldString).length - 1;

    if (occurrences === 0) {
      return { content: 'old_string not found in file', isError: true };
    }
    if (occurrences > 1) {
      return { content: `old_string found ${occurrences} times (must be unique)`, isError: true };
    }

    const updated = content.replace(oldString, newString);
    await fs.promises.writeFile(filePath, updated, 'utf-8');

    return { content: `File edited: ${args.file_path}`, isError: false };
  }

  private async bash(args: Record<string, unknown>): Promise<ToolResult> {
    const command = String(args.command ?? '');

    for (const blocked of BLOCKED_COMMANDS) {
      if (command.includes(blocked)) {
        return { content: `Blocked command: ${blocked}`, isError: true };
      }
    }

    return new Promise((resolve) => {
      exec(
        command,
        {
          cwd: this.vaultPath,
          timeout: BASH_TIMEOUT_MS,
          maxBuffer: MAX_OUTPUT_BYTES,
          env: { ...process.env, PATH: process.env.PATH },
        },
        (error: Error | null, stdout: string, stderr: string) => {
          if (error) {
            const output = stderr || stdout || error.message;
            resolve({
              content: output.slice(0, 10000),
              isError: true,
            });
          } else {
            const output = stdout + (stderr ? `\n${stderr}` : '');
            resolve({
              content: output.slice(0, 10000) || '(no output)',
              isError: false,
            });
          }
        },
      );
    });
  }

  private async grep(args: Record<string, unknown>): Promise<ToolResult> {
    const pattern = String(args.pattern ?? '');
    const searchPath = args.path ? this.resolvePath(String(args.path)) : this.vaultPath;
    const include = args.include ? `--include="${args.include}"` : '';
    const contextLines = Number(args.context_lines ?? 0);
    const contextFlag = contextLines > 0 ? `-C ${contextLines}` : '';

    const command = `grep -rn ${contextFlag} ${include} -E "${pattern.replace(/"/g, '\\"')}" "${searchPath}" 2>/dev/null | head -200`;

    return new Promise((resolve) => {
      exec(
        command,
        { cwd: this.vaultPath, timeout: BASH_TIMEOUT_MS, maxBuffer: MAX_OUTPUT_BYTES },
        (error: Error | null, stdout: string) => {
          if (error && !stdout) {
            resolve({ content: 'No matches found', isError: false });
          } else {
            resolve({ content: stdout.slice(0, 10000) || 'No matches found', isError: false });
          }
        },
      );
    });
  }

  private async glob(args: Record<string, unknown>): Promise<ToolResult> {
    const pattern = String(args.pattern ?? '');
    const searchPath = args.path ? this.resolvePath(String(args.path)) : this.vaultPath;

    const command = `find "${searchPath}" -path "*/${pattern}" -o -name "${pattern}" 2>/dev/null | head -200`;

    return new Promise((resolve) => {
      exec(
        command,
        { cwd: this.vaultPath, timeout: BASH_TIMEOUT_MS, maxBuffer: MAX_OUTPUT_BYTES },
        (error: Error | null, stdout: string) => {
          if (error && !stdout) {
            resolve({ content: 'No files found', isError: false });
          } else {
            // Convert absolute paths to relative
            const files = stdout
              .split('\n')
              .filter(Boolean)
              .map((f: string) => path.relative(this.vaultPath, f))
              .join('\n');
            resolve({ content: files || 'No files found', isError: false });
          }
        },
      );
    });
  }

  private async ls(args: Record<string, unknown>): Promise<ToolResult> {
    const dirPath = args.path ? this.resolvePath(String(args.path)) : this.vaultPath;

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const dirs = entries.filter((e: fs.Dirent) => e.isDirectory()).map((e: fs.Dirent) => `${e.name}/`);
    const files = entries.filter((e: fs.Dirent) => e.isFile()).map((e: fs.Dirent) => e.name);

    return {
      content: [...dirs.sort(), ...files.sort()].join('\n') || '(empty directory)',
      isError: false,
    };
  }
}
