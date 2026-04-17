import { config } from '../config.js';
import { SYSTEM_PROMPT, parseMessage, buildUserMessage } from '../generator.js';

export function create({ model, temperature }) {
  const apiKey = config.getApiKey('openai');

  if (!apiKey) {
    throw new Error('OpenAI API key not found. Set OPENAI_API_KEY environment variable or run: aicommit config set openaiKey YOUR_KEY');
  }

  return {
    name: 'openai',
    model: model || 'gpt-4o',

    async generate(diff, stats) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserMessage(diff, stats) }
          ],
          temperature: temperature ?? 0.3,
          max_tokens: 500
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      return parseMessage(data.choices[0].message.content);
    }
  };
}
