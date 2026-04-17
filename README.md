# ai-commit

🤖 AI-powered git commit message generator with multi-provider support.

Generate conventional commit messages using AI from OpenAI, Anthropic Claude, Ollama, vLLM, or Kimi.

## Features

- **Multi-provider**: OpenAI, Anthropic Claude, Ollama, vLLM, Kimi
- **Conventional Commits**: Follows the Conventional Commits specification
- **Persistent config**: Save your preferred provider and settings
- **Interactive mode**: Preview, edit, or cancel before committing
- **Dry run**: Test without creating commits

## Installation

```bash
npm install -g .
```

Or link it:
```bash
cd /path/to/ai-commit
npm link
```

## Quick Start

```bash
# 1. Set your default provider
ai-commit config set provider vllm

# 2. Add files to staging
git add .

# 3. Generate commit message
ai-commit
```

## Usage

### Basic Commands

```bash
ai-commit                  # Generate commit with default provider
ai-commit --dry-run        # Preview without committing
ai-commit -p openai        # Use specific provider
ai-commit -m gpt-4o        # Use specific model
```

### Configuration

```bash
# Set default provider
ai-commit config set provider vllm

# Set default model
ai-commit config set model gpt-4o

# Set temperature (creativity: 0-1)
ai-commit config set temperature 0.3

# View current config
ai-commit config get

# View specific setting
ai-commit config get provider

# Delete a setting
ai-commit config delete model
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --provider <name>` | AI provider | config/provider or 'openai' |
| `-m, --model <name>` | Model name | config/model |
| `-t, --temperature <number>` | AI creativity (0-1) | 0.3 |
| `--dry-run` | Preview only, no commit | false |
| `--no-edit` | Skip edit confirmation | false |

## Providers

### OpenAI

```bash
export OPENAI_API_KEY=sk-...
ai-commit -p openai -m gpt-4o
```

Models: `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`

### Anthropic Claude

```bash
export ANTHROPIC_API_KEY=sk-ant-...
ai-commit -p anthropic -m claude-sonnet-4-20250514
```

Models: `claude-sonnet-4-20250514`, `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`

### Ollama (Local)

```bash
export OLLAMA_HOST=http://localhost:11434
ai-commit -p ollama -m llama3
```

Runs open-source models locally. Default port: `11434`

Models: `llama3`, `llama3.1`, `mistral`, `codellama`, etc.

### vLLM (Local)

```bash
export VLLM_HOST=http://localhost:8090
ai-commit -p vllm
```

OpenAI-compatible local inference server. Default port: `8090`

```bash
# Example: Run vLLM with Docker
docker run --gpus all -v ~/.cache/huggingface:/root/.cache/huggingface \
  -p 8090:8000 \
  --env "HUGGING_FACE_HUB_TOKEN=hf_..." \
  vllm/vllm-openai:latest \
  --model meta-llama/Llama-3.3-70B-Instruct
```

### Kimi (Moonshot)

```bash
export MOONSHOT_API_KEY=sk-...
ai-commit -p kimi -m kimi-k2.5
```

Models: `kimi-k2.5`, `kimi-k2`, `kimi-k2-thinking`

## Environment Variables

| Variable | Description | Provider |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key | openai |
| `ANTHROPIC_API_KEY` | Anthropic API key | anthropic |
| `MOONSHOT_API_KEY` | Moonshot API key | kimi |
| `OLLAMA_HOST` | Ollama server URL | ollama |
| `VLLM_HOST` | vLLM server URL | vllm |

## Configuration File

Settings are stored in `~/.ai-commit.json`:

```json
{
  "provider": "vllm",
  "model": "llama3",
  "temperature": 0.3
}
```

## Commit Format

Messages follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(api): add user authentication endpoint

Implemented JWT-based authentication with refresh tokens.
Includes login, logout, and token refresh endpoints.
```

## Examples

```bash
# Quick commit with defaults
git add . && ai-commit

# Preview only
ai-commit --dry-run

# Use different provider just once
ai-commit -p anthropic

# Use specific model
ai-commit -m gpt-4-turbo

# More creative responses
ai-commit -t 0.7

# Deterministic responses
ai-commit -t 0.1

# Skip confirmation prompt
ai-commit --no-edit
```

## Requirements

- Node.js >= 18
- Git repository with staged changes
- API key (for cloud providers) or local AI server (Ollama/vLLM)

## License

MIT
