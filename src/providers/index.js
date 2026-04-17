import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const providers = {
  openai: () => require('./openai.js'),
  anthropic: () => require('./anthropic.js'),
  ollama: () => require('./ollama.js'),
  vllm: () => require('./vllm.js'),
  kimi: () => require('./kimi.js')
};

export function getProvider(name, options) {
  if (!providers[name]) {
    throw new Error(`Unknown provider: ${name}. Available: ${Object.keys(providers).join(', ')}`);
  }
  return providers[name]().create(options);
}
