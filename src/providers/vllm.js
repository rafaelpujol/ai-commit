import { config } from '../config.js';
import { createOpenAICompatible } from './openai-compatible.js';

const VLLM_TIMEOUT_MS = 180000; // 3 minutes for local models
const DEFAULT_MODEL = 'Qwen3.5-9B-OptiQ-4bit';

async function getDefaultModel(host) {
  const apiKey = config.getApiKey('vllm');
  const headers = {};
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  try {
    const res = await fetch(`${host}/v1/models`, { headers, signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    return data.data?.[0]?.id ?? DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

export const create = createOpenAICompatible({
  name: 'vllm',
  getBaseURL: () => config.getHost('vllm'),
  apiKeyName: 'vllm',
  requireApiKey: false,
  resolveModel: getDefaultModel,
  noModelError: 'vLLM: no model specified. Set it with: aicommit config set model <name> or use -m <name>',
  timeout: VLLM_TIMEOUT_MS,
  extraBody: {
    stop: ['\n\n\n', '```'],
    frequency_penalty: 0.1,
    presence_penalty: 0.1,
    // Disable Qwen3-style reasoning so the model follows the commit format
    thinking_budget: 0
  }
});
