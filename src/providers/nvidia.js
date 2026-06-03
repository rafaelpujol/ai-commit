import { config } from '../config.js';
import { SYSTEM_PROMPT, parseMessage, buildUserMessage } from '../generator.js';

export function create({ model, temperature }) {
  const apiKey = config.getApiKey('nvidia');

  if (!apiKey) {
    throw new Error('NVIDIA API key not found. Set NVIDIA_API_KEY environment variable or run: aicommit config set nvidiaKey YOUR_KEY');
  }

  return {
    name: 'nvidia',
    model: model || 'moonshotai/kimi-k2-instruct',

    async generateRaw(systemPrompt, userMessage) {
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
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
