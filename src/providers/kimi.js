import { createOpenAICompatible } from './openai-compatible.js';

export const create = createOpenAICompatible({
  name: 'kimi',
  baseURL: 'https://api.moonshot.ai',
  defaultModel: 'kimi-k2-0711-preview',
  apiKeyName: 'kimi',
  requireApiKey: true,
  apiKeyError: 'Moonshot API key not found. Set MOONSHOT_API_KEY environment variable or run: aicommit config set moonshotKey YOUR_KEY'
});
