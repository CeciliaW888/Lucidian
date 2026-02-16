# Lucidian

![GitHub stars](https://img.shields.io/github/stars/CeciliaW888/Lucidian?style=social)
![GitHub release](https://img.shields.io/github/v/release/CeciliaW888/Lucidian)
![License](https://img.shields.io/github/license/CeciliaW888/Lucidian)

![Preview](Preview.png)

An Obsidian plugin that embeds Claude Code and GitHub Copilot as AI collaborators in your vault. Your vault becomes the AI's working directory, giving it full agentic capabilities: file read/write, search, bash commands, and multi-step workflows.

## What is Lucidian?

**Lucidian** (loo-SID-ee-an) combines "lucid" (clear, easy to understand) with the suffix "-ian" (relating to). The name reflects clarity of thought and the plugin's role as an intelligent companion that brings lucidity to your creative and knowledge work.

## Features

- **Dual AI Provider**: Choose between Claude Code (via Anthropic) or GitHub Copilot for AI-powered assistance
- **Full Agentic Capabilities**: Leverage AI to read, write, and edit files, search, and execute bash commands, all within your Obsidian vault
- **Context-Aware**: Automatically attach the focused note, mention files with `@`, exclude notes by tag, include editor selection (Highlight), and access external directories for additional context
- **Vision Support**: Analyze images by sending them via drag-and-drop, paste, or file path
- **Inline Edit**: Edit selected text or insert content at cursor position directly in notes with word-level diff preview and read-only tool access for context
- **Instruction Mode (`#`)**: Add refined custom instructions to your system prompt directly from the chat input, with review/edit in a modal
- **Slash Commands**: Create reusable prompt templates triggered by `/command`, with argument placeholders, `@file` references, and optional inline bash substitutions
- **Skills**: Extend Lucidian with reusable capability modules that are automatically invoked based on context, compatible with Claude Code's skill format
- **Custom Agents**: Define custom subagents that AI can invoke, with support for tool restrictions and model overrides
- **Claude Code Plugins**: Enable Claude Code plugins installed via the CLI, with automatic discovery from `~/.claude/plugins` and per-vault configuration
- **MCP Support**: Connect external tools and data sources via Model Context Protocol servers (stdio, SSE, HTTP) with context-saving mode and `@`-mention activation
- **Advanced Model Control**: Select between Haiku, Sonnet, and Opus (Claude), or configure GitHub Copilot models, fine-tune thinking budget, and enable Sonnet with 1M context window
- **Plan Mode**: Toggle plan mode via Shift+Tab in the chat input. AI explores and designs before implementing, presenting a plan for approval
- **Security**: Permission modes (YOLO/Safe/Plan), safety blocklist, and vault confinement with symlink-safe checks
- **Animated Mascot**: Lucidian features an animated crystalline spirit mascot with states: idle, thinking, working, and done

## Requirements

### For Claude Code
- [Claude Code CLI](https://code.claude.com/docs/en/overview) installed (strongly recommend Native Install)
- Claude subscription/API or Custom model provider that supports Anthropic API format ([Openrouter](https://openrouter.ai/docs/guides/guides/claude-code-integration), [Kimi](https://platform.moonshot.ai/docs/guide/agent-support), [GLM](https://docs.z.ai/devpack/tool/claude), [DeepSeek](https://api-docs.deepseek.com/guides/anthropic_api), etc.)

### For GitHub Copilot
- GitHub account with Copilot subscription
- OAuth authentication (handled by plugin)

### General
- Obsidian v1.8.9+
- Desktop only (macOS, Linux, Windows)

## Installation

### From GitHub Release (recommended)

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/CeciliaW888/Lucidian/releases/latest)
2. Create a folder called `lucidian` in your vault's plugins folder:
   ```
   /path/to/vault/.obsidian/plugins/lucidian/
   ```
3. Copy the downloaded files into the `lucidian` folder
4. Enable the plugin in Obsidian:
   - Settings → Community plugins → Enable "Lucidian"

### Using BRAT

[BRAT](https://github.com/TfTHacker/obsidian42-brat) (Beta Reviewers Auto-update Tester) allows you to install and automatically update plugins directly from GitHub.

1. Install the BRAT plugin from Obsidian Community Plugins
2. Enable BRAT in Settings → Community plugins
3. Open BRAT settings and click "Add Beta plugin"
4. Enter the repository URL: `https://github.com/CeciliaW888/Lucidian`
5. Click "Add Plugin" and BRAT will install Lucidian automatically
6. Enable Lucidian in Settings → Community plugins

> **Tip**: BRAT will automatically check for updates and notify you when a new version is available.

### From source (development)

1. Clone this repository into your vault's plugins folder:
   ```bash
   cd /path/to/vault/.obsidian/plugins
   git clone https://github.com/CeciliaW888/Lucidian.git lucidian
   cd lucidian
   ```

2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```

3. Enable the plugin in Obsidian:
   - Settings → Community plugins → Enable "Lucidian"

### Development

```bash
# Watch mode
npm run dev

# Production build
npm run build
```

> **Tip**: Copy `.env.local.example` to `.env.local` and set up your vault path to auto-copy files during development.

## Usage

**Two modes:**
1. Click the crystal icon in ribbon or use command palette to open chat
2. Select text + hotkey for inline edit

Use it like Claude Code or GitHub Copilot—read, write, edit, search files in your vault.

### Selecting AI Provider

In Settings → Lucidian → AI Provider, choose between:
- **Claude Code**: Uses Anthropic's Claude models via Claude Code CLI
- **GitHub Copilot**: Uses GitHub's Copilot models via OAuth authentication

### Context

- **File**: Auto-attaches focused note; type `@` to attach other files
- **@-mention dropdown**: Type `@` to see MCP servers, agents, external contexts, and vault files
  - `@Agents/` shows custom agents for selection
  - `@mcp-server` enables context-saving MCP servers
  - `@folder/` filters to files from that external context (e.g., `@workspace/`)
  - Vault files shown by default
- **Selection**: Select text in editor, then chat—selection included automatically
- **Images**: Drag-drop, paste, or type path; configure media folder for `![[image]]` embeds
- **External contexts**: Click folder icon in toolbar for access to directories outside vault

### Features

- **Inline Edit**: Select text + hotkey to edit directly in notes with word-level diff preview
- **Instruction Mode**: Type `#` to add refined instructions to system prompt
- **Slash Commands**: Type `/` for custom prompt templates or skills
- **Skills**: Add `skill/SKILL.md` files to `~/.claude/skills/` or `{vault}/.claude/skills/`
- **Custom Agents**: Add `agent.md` files to `~/.claude/agents/` (global) or `{vault}/.claude/agents/` (vault-specific); select via `@Agents/` in chat
- **Claude Code Plugins**: Enable plugins via Settings → Claude Code Plugins
- **MCP**: Add external tools via Settings → MCP Servers; use `@mcp-server` in chat to activate

## Configuration

### Settings

**AI Provider**
- **Provider**: Choose between Claude Code or GitHub Copilot
- **Model**: Select specific model (varies by provider)

**Customization**
- **User name**: Your name for personalized greetings
- **Excluded tags**: Tags that prevent notes from auto-loading (e.g., `sensitive`, `private`)
- **Media folder**: Configure where vault stores attachments for embedded image support (e.g., `attachments`)
- **Custom system prompt**: Additional instructions appended to the default system prompt (Instruction Mode `#` saves here)
- **Enable auto-scroll**: Toggle automatic scrolling to bottom during streaming (default: on)
- **Auto-generate conversation titles**: Toggle AI-powered title generation after the first user message is sent
- **Title generation model**: Model used for auto-generating conversation titles (default: Auto/Haiku)
- **Vim-style navigation mappings**: Configure key bindings with lines like `map w scrollUp`, `map s scrollDown`, `map i focusInput`

**Hotkeys**
- **Inline edit hotkey**: Hotkey to trigger inline edit on selected text
- **Open chat hotkey**: Hotkey to open the chat sidebar

**Slash Commands**
- Create/edit/import/export custom `/commands` (optionally override model and allowed tools)

**MCP Servers**
- Add/edit/verify/delete MCP server configurations with context-saving mode

**Claude Code Plugins**
- Enable/disable Claude Code plugins discovered from `~/.claude/plugins`
- User-scoped plugins available in all vaults; project-scoped plugins only in matching vault

**Safety**
- **Load user Claude settings**: Load `~/.claude/settings.json` (user's Claude Code permission rules may bypass Safe mode)
- **Enable command blocklist**: Block dangerous bash commands (default: on)
- **Blocked commands**: Patterns to block (supports regex, platform-specific)
- **Allowed export paths**: Paths outside the vault where files can be exported (default: `~/Desktop`, `~/Downloads`). Supports `~`, `$VAR`, `${VAR}`, and `%VAR%` (Windows).

**Environment**
- **Custom variables**: Environment variables for Claude SDK (KEY=VALUE format, supports `export ` prefix)
- **Environment snippets**: Save and restore environment variable configurations

**Advanced**
- **Claude CLI path**: Custom path to Claude Code CLI (leave empty for auto-detection, only applies to Claude Code provider)

## Safety and Permissions

| Scope | Access |
|-------|--------|
| **Vault** | Full read/write (symlink-safe via `realpath`) |
| **Export paths** | Write-only (e.g., `~/Desktop`, `~/Downloads`) |
| **External contexts** | Full read/write (session-only, added via folder icon) |

- **YOLO mode**: No approval prompts; all tool calls execute automatically (default)
- **Safe mode**: Approval prompt per tool call; Bash requires exact match, file tools allow prefix match
- **Plan mode**: Explores and designs a plan before implementing. Toggle via Shift+Tab in the chat input

## Privacy & Data Use

- **Sent to API**: Your input, attached files, images, and tool call outputs. Default: Anthropic (Claude Code) or GitHub (Copilot); custom endpoint via `ANTHROPIC_BASE_URL`.
- **Local storage**: Settings, session metadata, and commands stored in `vault/.claude/`; session messages in `~/.claude/projects/` (SDK-native); legacy sessions in `vault/.claude/sessions/`.
- **No telemetry**: No tracking beyond your configured AI provider.

## Troubleshooting

### Claude CLI not found (Claude Code provider only)

If you encounter `spawn claude ENOENT` or `Claude CLI not found`, the plugin can't auto-detect your Claude installation. Common with Node version managers (nvm, fnm, volta).

**Solution**: Find your CLI path and set it in Settings → Advanced → Claude CLI path.

| Platform | Command | Example Path |
|----------|---------|--------------|
| macOS/Linux | `which claude` | `/Users/you/.volta/bin/claude` |
| Windows (native) | `where.exe claude` | `C:\Users\you\AppData\Local\Claude\claude.exe` |
| Windows (npm) | `npm root -g` | `{root}\@anthropic-ai\claude-code\cli.js` |

> **Note**: On Windows, avoid `.cmd` wrappers. Use `claude.exe` or `cli.js`.

**Alternative**: Add your Node.js bin directory to PATH in Settings → Environment → Custom variables.

### npm CLI and Node.js not in same directory

If using npm-installed CLI, check if `claude` and `node` are in the same directory:
```bash
dirname $(which claude)
dirname $(which node)
```

If different, GUI apps like Obsidian may not find Node.js.

**Solutions**:
1. Install native binary (recommended)
2. Add Node.js path to Settings → Environment: `PATH=/path/to/node/bin`

**Still having issues?** [Open a GitHub issue](https://github.com/CeciliaW888/Lucidian/issues) with your platform, CLI path, and error message.

## Architecture

```
src/
├── main.ts                      # Plugin entry point
├── core/                        # Core infrastructure
│   ├── agent/                   # Claude Agent SDK wrapper (ClaudianService)
│   ├── agents/                  # Custom agent management (AgentManager)
│   ├── commands/                # Slash command management (SlashCommandManager)
│   ├── copilot/                 # GitHub Copilot integration (CopilotService)
│   ├── hooks/                   # PreToolUse/PostToolUse hooks
│   ├── mcp/                     # MCP server config, service, and testing
│   ├── plugins/                 # Claude Code plugin discovery and management
│   ├── prompts/                 # System prompts for agents
│   ├── sdk/                     # SDK message transformation
│   ├── security/                # Approval, blocklist, path validation
│   ├── storage/                 # Distributed storage system
│   ├── tools/                   # Tool constants and utilities
│   └── types/                   # Type definitions
├── features/                    # Feature modules
│   ├── chat/                    # Main chat view + UI, rendering, controllers, tabs
│   ├── inline-edit/             # Inline edit service + UI
│   └── settings/                # Settings tab UI
├── shared/                      # Shared UI components and modals
│   ├── components/              # Input toolbar bits, dropdowns, selection highlight
│   ├── mention/                 # @-mention dropdown controller
│   ├── modals/                  # Instruction modal
│   ├── lucidian-mascot.ts       # Animated mascot with states
│   └── icons.ts                 # Shared SVG icons
├── i18n/                        # Internationalization (10 locales)
├── utils/                       # Modular utility functions
└── style/                       # Modular CSS (→ styles.css)
```

## Roadmap

- [x] Claude Code Plugin support
- [x] Custom agent (subagent) support
- [x] Plan mode
- [x] `rewind` and `fork` support (including `/fork` command)
- [x] `!command` support
- [x] GitHub Copilot integration
- [x] Lucidian mascot with animated states
- [ ] Tool renderers refinement
- [ ] Hooks and other advanced features
- [ ] More to come!

## License

Licensed under the [MIT License](LICENSE).

## Acknowledgments

- [Obsidian](https://obsidian.md) for the plugin API
- [Anthropic](https://anthropic.com) for Claude and the [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview)
- [GitHub](https://github.com) for Copilot API access
- Original Claudian project by [YishenTu](https://github.com/YishenTu/claudian) which inspired this fork
