# aicommit

AI-powered git commit message generator with multi-provider support.

Generate conventional commit messages — and GitHub pull requests — using AI from OpenAI, Anthropic Claude, Ollama, vLLM, or Kimi.

## Features

- **Multi-provider**: OpenAI, Anthropic Claude, Ollama, vLLM, Kimi
- **Conventional Commits**: Follows the [Conventional Commits](https://www.conventionalcommits.org/) specification
- **GitHub PR generation**: Create pull requests with AI-generated title and description (requires [GitHub CLI](https://cli.github.com))
- **Persistent config**: Save your preferred provider and settings
- **Interactive mode**: Preview, edit, or cancel before committing
- **Auto-stage**: Detects unstaged changes and offers to stage them automatically
- **Dry run**: Test without creating commits or PRs

## Installation

```bash
npm install -g @rafaelpujol/aicommit-cli
```

## Quick Start

```bash
# 1. Set your default provider
aicommit config set provider vllm

# 2. Generate a commit message (auto-detects changes)
aicommit

# Stage all and commit in one go
aicommit -a -y
```

## Usage

### Commit

```bash
aicommit                  # Generate commit with default provider
aicommit --dry-run        # Preview without committing
aicommit -a               # Stage all changes and commit
aicommit -a -y            # Stage all, auto-confirm commit
aicommit -p openai        # Use specific provider
aicommit -m gpt-4o        # Use specific model
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --provider <name>` | AI provider | config or `openai` |
| `-m, --model <name>` | Model name | config or provider default |
| `-t, --temperature <n>` | AI creativity (0–1) | `0.3` |
| `-a, --all` | Stage all changes if none are staged | `false` |
| `-y, --yes` | Auto-confirm without prompting | `false` |
| `--dry-run` | Preview only, no commit created | `false` |
| `--no-edit` | Skip edit step | `false` |
| `--pr` | Create a GitHub PR right after the commit | `false` |

### Pull Requests (requires GitHub CLI)

The `aicommit pr` command reads all commits on your current branch ahead of `main`, sends them to the AI, and generates a PR title and description. It then pushes your branch and opens the PR via the [GitHub CLI (`gh`)](https://cli.github.com).

> **Prerequisite:** install and authenticate the GitHub CLI first.
> ```bash
> brew install gh   # macOS
> gh auth login
> ```

```bash
# From your feature branch, after all commits are ready:
aicommit pr

# Use a specific provider
aicommit pr -p vllm

# Compare against a different base branch (default: main)
aicommit pr -b develop

# Auto-confirm without prompting
aicommit pr -y

# Preview title/body without creating the PR
aicommit pr --dry-run
```

#### `pr` options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --provider <name>` | AI provider | config or `openai` |
| `-m, --model <name>` | Model name | config or provider default |
| `-b, --base <branch>` | Base branch to compare against | `main` |
| `-y, --yes` | Auto-confirm without prompting | `false` |
| `--dry-run` | Preview only, no PR created | `false` |

#### Commit + PR in one step

If you prefer to create the PR immediately after a single commit, use `--pr`:

```bash
aicommit -a -y --pr
```

### Configuration

```bash
aicommit config set provider vllm      # Set default provider
aicommit config set model llama3       # Set default model
aicommit config set temperature 0.3    # Set temperature (0–1)
aicommit config get                    # View all settings
aicommit config get provider           # View single setting
aicommit config delete model           # Remove a setting
```

Settings are stored in `~/.aicommit.json`:

```json
{
  "provider": "vllm",
  "model": "llama3",
  "temperature": 0.3
}
```

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
aicommit -p anthropic
```

Models: `claude-sonnet-4-6`, `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`

### Ollama (local)

```bash
export OLLAMA_HOST=http://localhost:11434
aicommit -p ollama -m llama3
```

Runs open-source models locally. Default port: `11434`.  
Models: `llama3`, `mistral`, `codellama`, etc.

### vLLM (local)

```bash
export VLLM_HOST=http://localhost:8090
aicommit -p vllm
```

OpenAI-compatible local inference server. Default port: `8090`.  
If no model is specified, aicommit queries `/v1/models` and uses the first available model automatically.

```bash
# Example: run vLLM with Docker
docker run --gpus all \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -p 8090:8000 \
  --env "HUGGING_FACE_HUB_TOKEN=hf_..." \
  vllm/vllm-openai:latest \
  --model meta-llama/Llama-3.3-70B-Instruct
```

### Kimi (Moonshot)

```bash
export MOONSHOT_API_KEY=sk-...
aicommit -p kimi
```

Models: `kimi-k2-0711-preview`, `kimi-k2`, `kimi-k2-thinking`

## Environment Variables

| Variable | Provider |
|----------|----------|
| `OPENAI_API_KEY` | openai |
| `ANTHROPIC_API_KEY` | anthropic |
| `MOONSHOT_API_KEY` | kimi |
| `OLLAMA_HOST` | ollama |
| `VLLM_HOST` | vllm |

## Commit Format

```
feat(api): add user authentication endpoint

Implemented JWT-based authentication with refresh tokens.
Includes login, logout, and token refresh endpoints.
```

## Requirements

- Node.js >= 18
- Git repository
- API key (cloud providers) or local AI server (Ollama / vLLM)
- [GitHub CLI](https://cli.github.com) — only for `aicommit pr` and `--pr`

## License

MIT
