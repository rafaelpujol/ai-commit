import { createOpenAICompatible } from './openai-compatible.js';

export const create = createOpenAICompatible({
  name: 'nvidia',
  baseURL: 'https://integrate.api.nvidia.com',
  defaultModel: 'moonshotai/kimi-k2-instruct',
  apiKeyName: 'nvidia',
  requireApiKey: true,
  apiKeyError: 'NVIDIA API key not found. Set NVIDIA_API_KEY environment variable or run: aicommit config set nvidiaKey YOUR_KEY'
});
