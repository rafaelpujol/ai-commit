import { config } from '../config.js';
import { SYSTEM_PROMPT, parseMessage, buildUserMessage } from '../generator.js';

export function create({ model, temperature }) {
  const apiKey = config.getApiKey('kimi');

  if (!apiKey) {
    throw new Error('Moonshot API key not found. Set MOONSHOT_API_KEY environment variable or run: aicommit config set moonshotKey YOUR_KEY');
  }

  return {
    name: 'kimi',
    model: model || 'kimi-k2-0711-preview',

    async generateRaw(systemPrompt, userMessage) {
      const response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: temperature ?? 0.3,
          max_tokens: 1000
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return data.choices[0].message.content;
    },

    async generate(diff, stats) {
      const content = await this.generateRaw(SYSTEM_PROMPT, buildUserMessage(diff, stats));
      return parseMessage(content);
    }
  };
}
