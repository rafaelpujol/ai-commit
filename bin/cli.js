#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { config } from '../src/config.js';
import { getProvider } from '../src/providers/index.js';
import { generateCommitMessage } from '../src/generator.js';

const program = new Command();

program
  .name('ai-commit')
  .description(`
🤖 AI-powered git commit message generator

Generate conventional commit messages using AI from multiple providers.
Supports: OpenAI GPT-4, Anthropic Claude, Ollama, vLLM, Kimi.

Usage:
  ai-commit                  # Generate commit (uses default provider)
  ai-commit --dry-run        # Preview without committing
  ai-commit config set       # Configure defaults`)
  .version('1.0.0');

const configCmd = program.command('config')
  .description('Manage persistent configuration');

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

    const { diff, hasStaged } = await checkStagedFiles();
    
    if (!hasStaged) {
      console.log(chalk.red('❌ No staged files. Run: git add <files>'));
      process.exit(1);
    }

    console.log(chalk.blue(`🤖 Analyzing changes with ${chalk.bold(providerName)}...`));

    const message = await generateCommitMessage(provider, diff);

    console.log(chalk.green('\n📝 Generated commit message:'));
    console.log(`   ${chalk.bold('Summary:')} ${message.summary}`);
    if (message.description) {
      console.log(`   ${chalk.bold('Description:')} ${message.description}`);
    }

    if (dryRun) {
      console.log(chalk.yellow('\n[ Dry run - no commit created ]'));
      process.exit(0);
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

    let finalMessage = message.summary;
    if (message.description) {
      finalMessage += `\n\n${message.description}`;
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
  const { execSync } = await import('child_process');
  
  try {
    const diff = execSync('git diff --cached --no-color', { encoding: 'utf-8' });
    return { diff, hasStaged: diff.trim().length > 0 };
  } catch {
    return { diff: '', hasStaged: false };
  }
}

async function commit(message) {
  const { execSync } = await import('child_process');
  execSync(`git commit -F -`, { 
    input: message, 
    stdio: ['pipe', 'inherit', 'inherit'] 
  });
}

program.parse();
