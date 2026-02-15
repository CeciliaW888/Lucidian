export interface ModelOption {
	id: string;
	name: string;
	provider: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
	{ id: "gpt-4o-2024-08-06", name: "GPT-4o", provider: "OpenAI" },
	{ id: "gpt-4.1", name: "GPT-4.1", provider: "OpenAI" },
	{ id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", provider: "Anthropic" },
	{ id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "Anthropic" },
	{ id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "Anthropic" },
	{ id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google" },
	{ id: "o4-mini-2025-04-16", name: "o4-mini", provider: "OpenAI" },
];

export const DEFAULT_MODEL = AVAILABLE_MODELS[0];
