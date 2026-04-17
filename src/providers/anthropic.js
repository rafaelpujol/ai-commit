import { config } from '../config.js';
import { SYSTEM_PROMPT, parseMessage, buildUserMessage } from '../generator.js';

export function create({ model, temperature }) {
  const apiKey = config.getApiKey('anthropic');

  if (!apiKey) {
    throw new Error('Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable or run: aicommit config set anthropicKey YOUR_KEY');
  }

  return {
    name: 'anthropic',
    model: model || 'claude-sonnet-4-6',

    async generate(diff, stats) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          system: SYSTEM_PROMPT,
          messages: [
            { role: 'user', content: buildUserMessage(diff, stats) }
          ],
          temperature: temperature ?? 0.3,
          max_tokens: 500
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      return parseMessage(data.content[0].text);
    }
  };
}
