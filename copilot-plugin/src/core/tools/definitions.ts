import { ToolDefinition } from "../api/client";

export const TOOL_NAMES = {
	READ: "read_file",
	WRITE: "write_file",
	EDIT: "edit_file",
	BASH: "bash",
	GREP: "grep",
	GLOB: "glob",
	LS: "list_directory",
} as const;

export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

export const TOOL_DEFINITIONS: ToolDefinition[] = [
	{
		type: "function",
		function: {
			name: TOOL_NAMES.READ,
			description:
				"Read the contents of a file. Returns the file content with line numbers. Use this to understand code before modifying it.",
			parameters: {
				type: "object",
				properties: {
					file_path: {
						type: "string",
						description: "Path to the file, relative to the vault root",
					},
					offset: {
						type: "number",
						description: "Line number to start reading from (1-based). Optional.",
					},
					limit: {
						type: "number",
						description: "Maximum number of lines to read. Optional, defaults to 2000.",
					},
				},
				required: ["file_path"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: TOOL_NAMES.WRITE,
			description:
				"Create a new file or completely overwrite an existing file. Use edit_file for partial changes to existing files.",
			parameters: {
				type: "object",
				properties: {
					file_path: {
						type: "string",
						description: "Path to the file, relative to the vault root",
					},
					content: {
						type: "string",
						description: "The full content to write to the file",
					},
				},
				required: ["file_path", "content"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: TOOL_NAMES.EDIT,
			description:
				"Make a targeted edit to an existing file by replacing a specific string with new content. The old_string must match exactly and be unique in the file.",
			parameters: {
				type: "object",
				properties: {
					file_path: {
						type: "string",
						description: "Path to the file, relative to the vault root",
					},
					old_string: {
						type: "string",
						description: "The exact string to find and replace. Must be unique in the file.",
					},
					new_string: {
						type: "string",
						description: "The replacement string",
					},
				},
				required: ["file_path", "old_string", "new_string"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: TOOL_NAMES.BASH,
			description:
				"Execute a bash command in the vault directory. Use for git, npm, build tools, and other CLI operations. Commands run with a 30-second timeout.",
			parameters: {
				type: "object",
				properties: {
					command: {
						type: "string",
						description: "The bash command to execute",
					},
				},
				required: ["command"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: TOOL_NAMES.GREP,
			description:
				"Search for a regex pattern in files. Returns matching file paths or content lines. Use for finding code, function definitions, imports, etc.",
			parameters: {
				type: "object",
				properties: {
					pattern: {
						type: "string",
						description: "Regex pattern to search for",
					},
					path: {
						type: "string",
						description: "Directory or file to search in, relative to vault root. Defaults to vault root.",
					},
					include: {
						type: "string",
						description: 'Glob pattern to filter files, e.g. "*.ts" or "*.md"',
					},
					context_lines: {
						type: "number",
						description: "Number of context lines before and after each match. Default 0.",
					},
				},
				required: ["pattern"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: TOOL_NAMES.GLOB,
			description:
				"Find files matching a glob pattern. Returns a list of matching file paths. Use for discovering project structure.",
			parameters: {
				type: "object",
				properties: {
					pattern: {
						type: "string",
						description: 'Glob pattern, e.g. "**/*.ts", "src/**/*.md", "*.json"',
					},
					path: {
						type: "string",
						description: "Directory to search in, relative to vault root. Defaults to vault root.",
					},
				},
				required: ["pattern"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: TOOL_NAMES.LS,
			description: "List the contents of a directory. Shows files and subdirectories with their types.",
			parameters: {
				type: "object",
				properties: {
					path: {
						type: "string",
						description: "Directory path relative to vault root. Defaults to vault root.",
					},
				},
				required: [],
			},
		},
	},
];
