import { createOpenAICompatible } from './openai-compatible.js';

export const create = createOpenAICompatible({
  name: 'openai',
  baseURL: 'https://api.openai.com',
  defaultModel: 'gpt-4o',
  apiKeyName: 'openai',
  requireApiKey: true,
  apiKeyError: 'OpenAI API key not found. Set OPENAI_API_KEY environment variable or run: aicommit config set openaiKey YOUR_KEY'
});
