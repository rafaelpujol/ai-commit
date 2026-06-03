import { config } from '../config.js';
import { SYSTEM_PROMPT, parseMessage, buildUserMessage } from '../generator.js';

async function getDefaultModel(host) {
  try {
    const res = await fetch(`${host}/v1/models`);
    const data = await res.json();
    return data.data?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

export function create({ model, temperature, maxTokens }) {
  const host = config.getHost('vllm');

  return {
    name: 'vllm',
    model,

    async generateRaw(systemPrompt, userMessage) {
      const body = {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: temperature ?? 0.3,
        max_tokens: maxTokens ?? 8192
      };

      const resolvedModel = this.model ?? await getDefaultModel(host);
      if (resolvedModel) body.model = resolvedModel;

      const response = await fetch(`${host}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message ?? JSON.stringify(data.error));

      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error(`vLLM returned no content. Response: ${JSON.stringify(data)}`);
      return content;
    },

    async generate(diff, stats) {
      const content = await this.generateRaw(SYSTEM_PROMPT, buildUserMessage(diff, stats));
      return parseMessage(content);
    }
  };
}
