import { config } from '../config.js';
import { createOpenAICompatible } from './openai-compatible.js';

async function getDefaultModel(host) {
  try {
    const res = await fetch(`${host}/v1/models`);
    const data = await res.json();
    return data.data?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

export const create = createOpenAICompatible({
  name: 'vllm',
  getBaseURL: () => config.getHost('vllm'),
  apiKeyName: 'vllm',
  requireApiKey: false,
  resolveModel: getDefaultModel,
  noModelError: 'vLLM: no model specified. Set it with: aicommit config set model <name> or use -m <name>',
  extraBody: {
    stop: ['\n\n\n', 'SUMMARY:', '```'],
    frequency_penalty: 0.1,
    presence_penalty: 0.1
  }
});
