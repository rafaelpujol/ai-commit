# aicommit

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
npm install -g aicommit-cli
```

Or link it:
```bash
cd /path/to/aicommit
npm link
```

## Quick Start

```bash
# 1. Set your default provider
aicommit config set provider vllm

# 2. Add files to staging
git add .

# 3. Generate commit message
aicommit
```

## Usage

### Basic Commands

```bash
aicommit                  # Generate commit with default provider
aicommit --dry-run        # Preview without committing
aicommit -p openai        # Use specific provider
aicommit -m gpt-4o        # Use specific model
```

### Configuration

```bash
# Set default provider
aicommit config set provider vllm

# Set default model
aicommit config set model gpt-4o

# Set temperature (creativity: 0-1)
aicommit config set temperature 0.3

# View current config
aicommit config get

# View specific setting
aicommit config get provider

# Delete a setting
aicommit config delete model
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
aicommit -p openai -m gpt-4o
```

Models: `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`

### Anthropic Claude

```bash
export ANTHROPIC_API_KEY=sk-ant-...
aicommit -p anthropic -m claude-sonnet-4-20250514
```

Models: `claude-sonnet-4-20250514`, `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`

### Ollama (Local)

```bash
export OLLAMA_HOST=http://localhost:11434
aicommit -p ollama -m llama3
```

Runs open-source models locally. Default port: `11434`

Models: `llama3`, `llama3.1`, `mistral`, `codellama`, etc.

### vLLM (Local)

```bash
export VLLM_HOST=http://localhost:8090
aicommit -p vllm
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
aicommit -p kimi -m kimi-k2.5
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

Settings are stored in `~/.aicommit.json`:

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
git add . && aicommit

# Preview only
aicommit --dry-run

# Use different provider just once
aicommit -p anthropic

# Use specific model
aicommit -m gpt-4-turbo

# More creative responses
aicommit -t 0.7

# Deterministic responses
aicommit -t 0.1

# Skip confirmation prompt
aicommit --no-edit
```

## Requirements

- Node.js >= 18
- Git repository with staged changes
- API key (for cloud providers) or local AI server (Ollama/vLLM)

## License

MIT
