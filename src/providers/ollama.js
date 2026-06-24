import { config } from '../config.js';
import { SYSTEM_PROMPT, parseMessage, buildUserMessage } from '../generator.js';
import { REQUEST_TIMEOUT_MS } from './openai-compatible.js';

export function create({ model, temperature, maxTokens }) {
  const host = config.getHost('ollama');

  return {
    name: 'ollama',
    model: model || 'llama3',

    async generateRaw(systemPrompt, userMessage) {
      const options = { temperature: temperature ?? 0.3 };
      if (maxTokens != null) options.num_predict = maxTokens;

      const response = await fetch(`${host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          options,
          stream: false
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const content = data.message?.content;
      if (!content) throw new Error(`ollama returned no content. Response: ${JSON.stringify(data)}`);
      return content;
    },

    async generate(diff, stats) {
      const content = await this.generateRaw(SYSTEM_PROMPT, buildUserMessage(diff, stats));
      return parseMessage(content);
    }
  };
}
