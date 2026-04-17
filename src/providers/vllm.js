import { config } from '../config.js';
import { SYSTEM_PROMPT, parseMessage, buildUserMessage } from '../generator.js';

export function create({ model, temperature }) {
  const host = config.getHost('vllm');

  return {
    name: 'vllm',
    model,

    async generate(diff, stats) {
      const body = {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserMessage(diff, stats) }
        ],
        temperature: temperature ?? 0.3,
        max_tokens: 500
      };

      if (this.model) body.model = this.model;

      const response = await fetch(`${host}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      return parseMessage(data.choices[0].message.content);
    }
  };
}
