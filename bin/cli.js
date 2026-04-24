#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { config } from '../src/config.js';
import { getProvider } from '../src/providers/index.js';
import { generateCommitMessage } from '../src/generator.js';

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
  .version('1.0.0');

const configCmd = program.command('config')
  .description('Manage persistent configuration (stored in ~/.ai-commit.json)');

configCmd
  .command('set <key> <value>')
  .description('Set a configuration value')
  .action((key, value) => {
    if (key === 'provider' && !['openai', 'anthropic', 'ollama', 'vllm', 'kimi'].includes(value)) {
      console.log(chalk.red(`Invalid provider: ${value}`));
      console.log(chalk.yellow('Available: openai, anthropic, ollama, vllm, kimi'));
      process.exit(1);
    }
    if (key === 'temperature' && (isNaN(value) || value < 0 || value > 1)) {
      console.log(chalk.red('Temperature must be between 0 and 1'));
      process.exit(1);
    }
    config.set(key, key === 'temperature' ? parseFloat(value) : value);
    console.log(chalk.green(`✅ ${key} set to ${value}`));
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
      console.log(`  model:       ${config.get('model') ? chalk.cyan(config.get('model')) : chalk.gray('(not set)')}`);
      console.log(`  temperature: ${config.get('temperature') ? chalk.cyan(config.get('temperature')) : chalk.gray('(not set)')}`);
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
  .option('--no-edit', 'Skip edit confirmation')
  .option('-y, --yes', 'Auto-confirm commit without prompting')
  .option('-a, --all', 'Stage all changes automatically if none are staged')
  .option('--dry-run', 'Preview commit without creating it')
  .action(async (options) => {
    await runCommit(options);
  });

async function runCommit(options) {
  try {
    const providerName = options.provider || config.get('provider') || 'openai';
    const model = options.model || config.get('model');
    const temperature = options.temperature ?? config.get('temperature') ?? 0.3;
    const dryRun = options.dryRun ?? false;

    const provider = getProvider(providerName, { model, temperature });

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
  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    process.exit(1);
  }
}

async function checkStagedFiles() {
  try {
    const diff = execSync('git diff --cached --no-color', { encoding: 'utf-8' });
    if (diff.trim()) {
      let stats = null;
      try {
        stats = execSync('git diff --cached --stat --no-color', { encoding: 'utf-8' });
      } catch { /* non-fatal */ }
      return { diff, stats, hasStaged: true, hasUnstaged: false };
    }
  } catch {
    return { diff: '', stats: null, hasStaged: false, hasUnstaged: false };
  }

  // No staged changes — check for unstaged
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
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

program.parse();
