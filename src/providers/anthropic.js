import { config } from '../config.js';

const SYSTEM_PROMPT = `You are a git commit expert. Generate commit messages following Conventional Commits format.
Respond with ONLY two lines:
SUMMARY: <type>(<scope>): <short description max 50 chars>
DESCRIPTION: <optional detailed description>

Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build`;

export function create({ model, temperature }) {
  const apiKey = config.getApiKey('anthropic');
  
  if (!apiKey) {
    throw new Error('Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable or run: ai-commit config set anthropicKey YOUR_KEY');
  }

  return {
    name: 'anthropic',
    model: model || 'claude-sonnet-4-20250514',

    async generate(diff) {
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
            { role: 'user', content: `Generate commit for this diff:\n\n${diff}` }
          ],
          temperature: temperature || 0.3,
          max_tokens: 200
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      return parseMessage(data.content[0].text);
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
