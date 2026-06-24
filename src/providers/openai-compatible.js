import { config } from '../config.js';
import { SYSTEM_PROMPT, parseMessage, buildUserMessage } from '../generator.js';

export const REQUEST_TIMEOUT_MS = 30000;

/**
 * Builds a provider backed by an OpenAI-compatible `/v1/chat/completions`
 * endpoint. Covers OpenAI, Kimi (Moonshot), NVIDIA and vLLM — they only
 * differ in base URL, default model, auth and a few body extras.
 *
 * @param {object} spec
 * @param {string} spec.name              provider id
 * @param {string} [spec.baseURL]         static base URL (no trailing /v1)
 * @param {() => string} [spec.getBaseURL] dynamic base URL (e.g. vLLM host)
 * @param {string} [spec.defaultModel]    fallback model when none is configured
 * @param {string} [spec.apiKeyName]      provider name passed to config.getApiKey
 * @param {boolean} [spec.requireApiKey]  throw if no key is found
 * @param {string} [spec.apiKeyError]     error message when the key is missing
 * @param {string} [spec.noModelError]    error message when no model can be resolved
 * @param {object} [spec.extraBody]       extra request-body fields (stop, penalties…)
 * @param {(baseURL: string) => Promise<string|null>} [spec.resolveModel]
 *        async fallback to discover a model when none is configured
 */
export function createOpenAICompatible(spec) {
  return ({ model, temperature, maxTokens }) => {
    const apiKey = spec.apiKeyName ? config.getApiKey(spec.apiKeyName) : undefined;
    if (spec.requireApiKey && !apiKey) {
      throw new Error(spec.apiKeyError ?? `${spec.name} API key not found.`);
    }

    const baseURL = spec.getBaseURL ? spec.getBaseURL() : spec.baseURL;

    return {
      name: spec.name,
      model: model || spec.defaultModel || null,

      async generateRaw(systemPrompt, userMessage) {
        let resolvedModel = this.model;
        if (!resolvedModel && spec.resolveModel) {
          resolvedModel = await spec.resolveModel(baseURL);
        }
        if (!resolvedModel) {
          throw new Error(spec.noModelError ?? `${spec.name}: no model specified. Use -m <name> or: aicommit config set model <name>`);
        }

        const body = {
          model: resolvedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: temperature ?? 0.3,
          max_tokens: maxTokens ?? 1000,
          ...spec.extraBody
        };

        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

        const response = await fetch(`${baseURL}/v1/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message ?? JSON.stringify(data.error));

        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error(`${spec.name} returned no content. Response: ${JSON.stringify(data)}`);
        return content;
      },

      async generate(diff, stats) {
        return parseMessage(await this.generateRaw(SYSTEM_PROMPT, buildUserMessage(diff, stats)));
      }
    };
  };
}
