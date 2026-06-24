#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { config } from '../src/config.js';
import { getProvider } from '../src/providers/index.js';
import { generateCommitMessage, PR_SYSTEM_PROMPT, parsePRMessage, buildPRUserMessage } from '../src/generator.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));

const program = new Command();

program
  .name('aicommit')
  .description(`AI-powered git commit message generator

Generate conventional commits with AI. Supports OpenAI, Claude, Ollama, vLLM, Kimi.

Examples:
  aicommit                   # Generate commit (uses default provider)
  aicommit --dry-run         # Preview without committing
  aicommit -y                # Auto-confirm commit
  aicommit -a                # Stage all changes and commit
  aicommit -a -y             # Stage all, auto-confirm commit
  aicommit config set        # Configure defaults`)
  .version(pkg.version);

const configCmd = program.command('config')
  .description('Manage persistent configuration (stored in ~/.ai-commit.json)');

configCmd
  .command('set <key> <value>')
  .description('Set a configuration value')
  .action((key, value) => {
    if (['openaiKey', 'anthropicKey', 'moonshotKey', 'vllmKey', 'nvidiaKey'].includes(key)) {
      console.log(chalk.red(`API keys cannot be set via config. Use environment variables instead:`));
      console.log(chalk.yellow('  OPENAI_API_KEY, ANTHROPIC_API_KEY, MOONSHOT_API_KEY, VLLM_API_KEY, NVIDIA_API_KEY'));
      process.exit(1);
    }
    if (key === 'provider' && !['openai', 'anthropic', 'ollama', 'vllm', 'kimi', 'nvidia'].includes(value)) {
      console.log(chalk.red(`Invalid provider: ${value}`));
      console.log(chalk.yellow('Available: openai, anthropic, ollama, vllm, kimi, nvidia'));
      process.exit(1);
    }
    if (key === 'temperature' && (isNaN(value) || value < 0 || value > 1)) {
      console.log(chalk.red('Temperature must be between 0 and 1'));
      process.exit(1);
    }
    if (key === 'maxTokens' && (isNaN(value) || parseInt(value) < 1)) {
      console.log(chalk.red('maxTokens must be a positive integer'));
      process.exit(1);
    }
    let effectiveKey = key;
    if (key === 'model') {
      const currentProvider = config.get('provider');
      if (currentProvider) {
        effectiveKey = `${currentProvider}Model`;
      }
    }
    config.set(effectiveKey, key === 'temperature' ? parseFloat(value) : key === 'maxTokens' ? parseInt(value) : value);
    console.log(chalk.green(`✅ ${effectiveKey} set to ${value}`));
  });

configCmd
  .command('get [key]')
  .description('Get configuration value (shows all if no key)')
  .action((key) => {
    const currentProvider = config.get('provider') || 'openai';
    if (key) {
      const value = config.get(key);
      console.log(`${key}: ${value || '(not set)'}`);
    } else {
      console.log(chalk.bold('\n📋 Current configuration:\n'));
      console.log(`  provider:    ${chalk.cyan(currentProvider)}`);
      console.log(`  model:       ${config.getModel(currentProvider) ? chalk.cyan(config.getModel(currentProvider)) : chalk.gray('(not set)')}`);
      console.log(`  temperature: ${config.get('temperature') ? chalk.cyan(config.get('temperature')) : chalk.gray('(not set)')}`);
      console.log(`  maxTokens:   ${config.get('maxTokens') ? chalk.cyan(config.get('maxTokens')) : chalk.gray('(not set)')}`);
      const vllmKey = config.getApiKey('vllm');
      console.log(`  vllmKey:     ${vllmKey ? chalk.green('***' + vllmKey.slice(-4)) : chalk.gray('(not set)')}`);
      console.log(chalk.gray('\n  Config file: ~/.ai-commit.json'));
    }
  });

configCmd
  .command('delete <key>')
  .description('Delete a configuration value')
  .action((key) => {
    config.set(key, undefined);
    console.log(chalk.green(`✅ ${key} deleted`));
  });

program
  .option('-p, --provider <name>', `AI provider (openai, anthropic, ollama, vllm, kimi)
                                Default: from config or 'openai'`)
  .option('-m, --model <name>', 'Model name (provider-specific)')
  .option('-t, --temperature <number>', 'AI creativity (0-1, default: 0.3)', parseFloat)
  .option('--max-tokens <number>', 'Max tokens for AI response (default: 8192)', parseInt)
  .option('--no-edit', 'Skip edit confirmation')
  .option('-y, --yes', 'Auto-confirm commit without prompting')
  .option('-a, --all', 'Stage all changes automatically if none are staged')
  .option('--dry-run', 'Preview commit without creating it')
  .option('--pr', 'Create a GitHub PR after committing (requires gh CLI)')
  .action(async (options) => {
    await runCommit(options);
  });

async function runCommit(options) {
  try {
    if (!isInsideGitRepo()) {
      console.log(chalk.red('❌ Not inside a git repository.'));
      process.exit(1);
    }

    const providerName = options.provider || config.get('provider') || 'openai';
    const model = options.model || config.getModel(providerName);
    const temperature = options.temperature ?? config.get('temperature') ?? 0.3;
    const maxTokens = options.maxTokens ?? config.get('maxTokens') ?? 8192;
    const dryRun = options.dryRun ?? false;

    const provider = getProvider(providerName, { model, temperature, maxTokens });

    let { diff, stats, hasStaged, hasUnstaged } = await checkStagedFiles();

    if (!hasStaged) {
      if (!hasUnstaged) {
        console.log(chalk.red('❌ No changes to commit.'));
        process.exit(1);
      }

      if (options.all) {
        execSync('git add -A', { encoding: 'utf-8' });
        console.log(chalk.yellow('📦 Staged all changes automatically (--all)'));
      } else {
        const { shouldStage } = await inquirer.prompt([
          {
            type: 'list',
            name: 'shouldStage',
            message: 'No staged changes found. Stage all changes and continue?',
            choices: [
              { name: 'Yes', value: true },
              { name: 'No', value: false }
            ],
            default: true
          }
        ]);
        if (!shouldStage) {
          console.log(chalk.yellow('Cancelled'));
          process.exit(0);
        }
        execSync('git add -A', { encoding: 'utf-8' });
        console.log(chalk.yellow('📦 Staged all changes'));
      }

      // Re-read staged diff after adding
      const staged = await checkStagedFiles();
      diff = staged.diff;
      stats = staged.stats;
      hasStaged = staged.hasStaged;
    }

    console.log(chalk.blue(`🤖 Analyzing changes with ${chalk.bold(providerName)}...`));

    const message = await generateCommitMessage(provider, diff, stats);

    console.log(chalk.green('\n📝 Generated commit message:'));
    console.log(`   ${chalk.bold('Summary:')} ${message.summary}`);
    if (message.description) {
      console.log(`   ${chalk.bold('Description:')} ${message.description}`);
    }

    if (dryRun) {
      console.log(chalk.yellow('\n[ Dry run - no commit created ]'));
      process.exit(0);
    }

    let finalMessage = message.summary;
    if (message.description) {
      finalMessage += `\n\n${message.description}`;
    }

    if (options.yes) {
      await commit(finalMessage);
      console.log(chalk.green('\n✅ Commit created successfully!'));
      if (options.pr) await createPR(message.summary, message.description);
      return;
    }

    const { confirm } = await inquirer.prompt([
      {
        type: 'list',
        name: 'confirm',
        message: 'Commit?',
        choices: [
          { name: 'Yes', value: 'yes' },
          { name: 'Edit', value: 'edit' },
          { name: 'Cancel', value: 'cancel' }
        ],
        default: 'yes'
      }
    ]);

    if (confirm === 'cancel') {
      console.log(chalk.yellow('Cancelled'));
      process.exit(0);
    }

    if (confirm === 'edit') {
      const { editedMessage } = await inquirer.prompt([
        {
          type: 'editor',
          name: 'editedMessage',
          message: 'Edit commit message:',
          default: finalMessage
        }
      ]);
      finalMessage = editedMessage;
    }

    await commit(finalMessage);
    console.log(chalk.green('\n✅ Commit created successfully!'));
    if (options.pr) await createPR(message.summary, message.description);
  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    process.exit(1);
  }
}

function isInsideGitRepo() {
  try {
    const out = execSync('git rev-parse --is-inside-work-tree', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return out.trim() === 'true';
  } catch {
    return false;
  }
}

async function checkStagedFiles() {
  try {
    const diff = execSync('git diff --cached --no-color', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    if (diff.trim()) {
      let stats = null;
      try {
        stats = execSync('git diff --cached --stat --no-color', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch { /* non-fatal */ }
      return { diff, stats, hasStaged: true, hasUnstaged: false };
    }
  } catch {
    return { diff: '', stats: null, hasStaged: false, hasUnstaged: false };
  }

  // No staged changes — check for unstaged
  try {
    const status = execSync('git status --porcelain', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const hasUnstaged = status.trim().length > 0;
    return { diff: '', stats: null, hasStaged: false, hasUnstaged };
  } catch {
    return { diff: '', stats: null, hasStaged: false, hasUnstaged: false };
  }
}

async function commit(message) {
  execSync(`git commit -F -`, {
    input: message,
    stdio: ['pipe', 'inherit', 'inherit']
  });
}

program
  .command('pr')
  .description('Generate a PR title/description from current branch and create it on GitHub')
  .option('-p, --provider <name>', 'AI provider (openai, anthropic, ollama, vllm, kimi)')
  .option('-m, --model <name>', 'Model name')
  .option('-b, --base <branch>', 'Base branch to compare against', 'main')
  .option('-y, --yes', 'Auto-confirm without prompting')
  .option('--dry-run', 'Preview PR without creating it')
  .action(async (options) => {
    try {
      if (!isInsideGitRepo()) {
        console.log(chalk.red('❌ Not inside a git repository.'));
        process.exit(1);
      }

      try {
        execSync('gh --version', { stdio: 'ignore' });
      } catch {
        console.log(chalk.red('❌ gh CLI not found. Install it from https://cli.github.com'));
        process.exit(1);
      }

      const providerName = options.provider || config.get('provider') || 'openai';
      const model = options.model || config.getModel(providerName);
      const temperature = config.get('temperature') ?? 0.3;
      const base = options.base;

      const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
      if (branch === base) {
        console.log(chalk.red(`❌ Already on base branch (${base}). Create a feature branch first.`));
        process.exit(1);
      }

      const commits = execSync(`git log ${base}..HEAD --oneline`, { encoding: 'utf-8' }).trim();
      if (!commits) {
        console.log(chalk.red(`❌ No commits ahead of ${base}.`));
        process.exit(1);
      }

      const diff = execSync(`git diff ${base}...HEAD --no-color`, { encoding: 'utf-8' });

      const provider = getProvider(providerName, { model, temperature });
      console.log(chalk.blue(`🤖 Generating PR description with ${chalk.bold(providerName)}...`));

      const raw = await provider.generateRaw(PR_SYSTEM_PROMPT, buildPRUserMessage(commits, diff));
      const pr = parsePRMessage(raw);

      console.log(chalk.green('\n📝 Generated PR:'));
      console.log(`   ${chalk.bold('Title:')} ${pr.title}`);
      if (pr.body) {
        console.log(`   ${chalk.bold('Body:')}\n${pr.body.split('\n').map(l => '   ' + l).join('\n')}`);
      }

      if (options.dryRun) {
        console.log(chalk.yellow('\n[ Dry run - no PR created ]'));
        process.exit(0);
      }

      if (!options.yes) {
        const { confirm } = await inquirer.prompt([{
          type: 'list',
          name: 'confirm',
          message: 'Create PR?',
          choices: [
            { name: 'Yes', value: true },
            { name: 'Cancel', value: false }
          ],
          default: true
        }]);
        if (!confirm) {
          console.log(chalk.yellow('Cancelled'));
          process.exit(0);
        }
      }

      console.log(chalk.blue('\n🚀 Pushing branch and creating PR...'));
      execSync(`git push -u origin ${branch}`, { stdio: 'inherit' });

      const prUrl = execSync(
        `gh pr create --title ${JSON.stringify(pr.title)} --body ${JSON.stringify(pr.body || '')} --base ${base}`,
        { encoding: 'utf-8' }
      ).trim();

      console.log(chalk.green(`\n✅ PR created: ${chalk.bold(prUrl)}`));
    } catch (err) {
      console.error(chalk.red(`\n❌ Error: ${err.message}`));
      process.exit(1);
    }
  });

async function createPR(title, body) {
  try {
    execSync('gh --version', { stdio: 'ignore' });
  } catch {
    console.log(chalk.red('❌ gh CLI not found. Install it from https://cli.github.com'));
    return;
  }

  try {
    console.log(chalk.blue('\n🚀 Pushing branch and creating PR...'));
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    execSync(`git push -u origin ${branch}`, { stdio: 'inherit' });

    const args = [`--title`, title];
    if (body) {
      args.push('--body', body);
    } else {
      args.push('--body', '');
    }

    const prUrl = execSync(`gh pr create ${args.map(a => JSON.stringify(a)).join(' ')}`, {
      encoding: 'utf-8'
    }).trim();

    console.log(chalk.green(`\n✅ PR created: ${chalk.bold(prUrl)}`));
  } catch (err) {
    console.log(chalk.red(`\n❌ PR creation failed: ${err.message}`));
  }
}

program.parse();
