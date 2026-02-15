/**
 * Available models for GitHub Copilot integration.
 */

export interface CopilotModelOption {
  id: string;
  name: string;
  provider: string;
}

export const COPILOT_MODELS: CopilotModelOption[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'o1-preview', name: 'o1-preview', provider: 'OpenAI' },
  { id: 'o1-mini', name: 'o1-mini', provider: 'OpenAI' },
];

export const DEFAULT_COPILOT_MODEL = COPILOT_MODELS[0];
