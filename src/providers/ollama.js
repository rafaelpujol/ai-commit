import { config } from '../config.js';
import { SYSTEM_PROMPT, parseMessage, buildUserMessage } from '../generator.js';

export function create({ model, temperature }) {
  const host = config.getHost('ollama');

  return {
    name: 'ollama',
    model: model || 'llama3',

    async generate(diff, stats) {
      const response = await fetch(`${host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserMessage(diff, stats) }
          ],
          temperature: temperature ?? 0.3,
          stream: false
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      return parseMessage(data.message.content);
    }
  };
}
