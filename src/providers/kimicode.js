import { config } from '../config.js';
import { SYSTEM_PROMPT, parseMessage, buildUserMessage } from '../generator.js';
import { REQUEST_TIMEOUT_MS } from './openai-compatible.js';

const KIMI_CODE_BASE_URL = 'https://api.kimi.com/coding';

export function create({ model, temperature, maxTokens }) {
  const apiKey = config.getApiKey('kimicode');

  if (!apiKey) {
    throw new Error('Kimi Code API key not found. Set KIMICODE_API_KEY environment variable (or KIMI_API_KEY / MOONSHOT_API_KEY as fallback) or run: aicommit config set kimicodeKey YOUR_KEY');
  }

  return {
    name: 'kimicode',
    model: model || 'kimi-k2-turbo-preview',

    async generateRaw(systemPrompt, userMessage) {
      const response = await fetch(`${KIMI_CODE_BASE_URL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'User-Agent': 'claude-code/0.1.0'
        },
        body: JSON.stringify({
          model: this.model,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
          temperature: temperature ?? 0.3,
          max_tokens: maxTokens ?? 1000
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message ?? JSON.stringify(data.error));
      if (!response.ok) throw new Error(`Kimi Code HTTP ${response.status}: ${JSON.stringify(data)}`);

      const contentItem = data.content?.find(c => c.type === 'text' || c.type === 'text_delta');
      const content = contentItem?.text;
      if (!content) throw new Error(`kimicode returned no content. Response: ${JSON.stringify(data)}`);
      return content;
    },

    async generate(diff, stats) {
      const content = await this.generateRaw(SYSTEM_PROMPT, buildUserMessage(diff, stats));
      return parseMessage(content);
    }
  };
}
