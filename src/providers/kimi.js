import { config } from '../config.js';

const SYSTEM_PROMPT = `Eres un experto en git. Genera mensajes de commit siguiendo el formato Conventional Commits.
Responde SOLO con dos líneas:
SUMMARY: <tipo>(<alcance>): <descripción corta máx 50 chars>
DESCRIPTION: <descripción detallada opcional>

Tipos: feat, fix, docs, style, refactor, test, chore, perf, ci`;

export function create({ model, temperature }) {
  const apiKey = config.getApiKey('kimi');
  
  if (!apiKey) {
    throw new Error('Moonshot API key not found. Set MOONSHOT_API_KEY environment variable or run: ai-commit config set moonshotKey YOUR_KEY');
  }

  return {
    name: 'kimi',
    model: model || 'kimi-k2.5',

    async generate(diff) {
      const response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Genera commit para este diff:\n\n${diff}` }
          ],
          temperature: temperature || 0.3,
          max_tokens: 200
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      return parseMessage(data.choices[0].message.content);
    }
  };
}

function parseMessage(content) {
  const summaryMatch = content.match(/^SUMMARY:\s*(.+)/m);
  const descMatch = content.match(/^DESCRIPTION:\s*(.+)/m);

  return {
    summary: summaryMatch ? summaryMatch[1].trim() : content.split('\n')[0],
    description: descMatch ? descMatch[1].trim() : null
  };
}
