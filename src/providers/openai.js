import { config } from '../config.js';

const SYSTEM_PROMPT = `You are a git commit expert. Generate commit messages following Conventional Commits format.
Respond with ONLY two lines:
SUMMARY: <type>(<scope>): <short description max 50 chars>
DESCRIPTION: <optional detailed description>

Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build
Examples: feat(api): add user endpoint, fix(auth): resolve token expiry`;

export function create({ model, temperature }) {
  const apiKey = config.getApiKey('openai');
  
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Set OPENAI_API_KEY environment variable or run: ai-commit config set openaiKey YOUR_KEY');
  }

  return {
    name: 'openai',
    model: model || 'gpt-4o',

    async generate(diff) {
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
