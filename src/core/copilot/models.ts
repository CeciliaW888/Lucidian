/**
 * Available models for GitHub Copilot integration.
 */

import type { CopilotApiModel } from './client';

export interface CopilotModelOption {
  id: string;
  name: string;
  provider: string;
}

export const COPILOT_FALLBACK_MODELS: CopilotModelOption[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'o1-preview', name: 'o1-preview', provider: 'OpenAI' },
  { id: 'o1-mini', name: 'o1-mini', provider: 'OpenAI' },
];

export const DEFAULT_COPILOT_MODEL_ID = 'gpt-4o';

const KNOWN_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  COPILOT_FALLBACK_MODELS.map(m => [m.id, m.name])
);

const OWNER_TO_PROVIDER: Record<string, string> = {
  'openai': 'OpenAI',
  'anthropic': 'Anthropic',
  'google': 'Google',
  'microsoft': 'Microsoft',
  'meta': 'Meta',
  'mistral': 'Mistral',
};

export function apiModelToOption(apiModel: CopilotApiModel): CopilotModelOption {
  const provider = OWNER_TO_PROVIDER[apiModel.owned_by] ?? apiModel.owned_by;
  const name = KNOWN_DISPLAY_NAMES[apiModel.id] ?? apiModel.id;
  return { id: apiModel.id, name, provider };
}
