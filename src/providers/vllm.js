import { config } from '../config.js';

const SYSTEM_PROMPT = `You are a git commit expert. Generate commit messages following Conventional Commits format.
Respond with ONLY two lines:
SUMMARY: <type>(<scope>): <short description max 50 chars>
DESCRIPTION: <optional detailed description>

Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build`;

export function create({ model, temperature }) {
  const host = config.getHost('vllm');

  return {
    name: 'vllm',
    model: model,

    async generate(diff) {
      const body = {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Generate commit for this diff:\n\n${diff}` }
        ],
        temperature: temperature || 0.3,
        max_tokens: 200
      };

      if (this.model) {
        body.model = this.model;
      }

      const response = await fetch(`${host}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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
