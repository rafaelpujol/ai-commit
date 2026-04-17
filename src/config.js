import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { configDotenv } from 'dotenv';

configDotenv();

const CONFIG_PATH = join(homedir(), '.ai-commit.json');

function loadConfig() {
  if (existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveConfig(data) {
  writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

export const config = {
  loadConfig,

  get(key) {
    const fileConfig = loadConfig();
    
    const envKey = {
      provider: 'AI_COMMIT_PROVIDER',
      model: 'AI_COMMIT_MODEL',
      temperature: 'AI_COMMIT_TEMPERATURE',
      openaiKey: 'OPENAI_API_KEY',
      anthropicKey: 'ANTHROPIC_API_KEY',
      moonshotKey: 'MOONSHOT_API_KEY',
      ollamaHost: 'OLLAMA_HOST',
      vllmHost: 'VLLM_HOST'
    }[key];

    return process.env[envKey] ?? fileConfig[key];
  },

  set(key, value) {
    const data = loadConfig();
    if (value === undefined || value === null) {
      delete data[key];
    } else {
      data[key] = value;
    }
    saveConfig(data);
  },

  getApiKey(provider) {
    const keys = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      kimi: 'MOONSHOT_API_KEY'
    };
    return process.env[keys[provider]];
  },

  getHost(provider) {
    const hosts = {
      ollama: process.env.OLLAMA_HOST || 'http://localhost:11434',
      vllm: process.env.VLLM_HOST || 'http://localhost:8090'
    };
    return hosts[provider];
  }
};
