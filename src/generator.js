const MAX_DIFF_LENGTH = 12000;

export const SYSTEM_PROMPT = `You are a precise technical writer specializing in git commit messages. Analyze the provided diff and generate a commit message following the Conventional Commits specification.

Output format — SUMMARY is always required, DESCRIPTION is optional:
  SUMMARY: <type>(<scope>): <description>
  DESCRIPTION: <multi-line body>        ← omit this line entirely if not needed

Rules:
- SUMMARY: max 72 characters. Use imperative mood: "add endpoint" not "added endpoint", "remove unused import" not "removes unused import"
- scope: infer from the changed file paths (e.g. auth, api, ui, config) — omit scope if the change spans the whole codebase or scope is unclear
- DESCRIPTION: include only when the summary alone is not enough to understand WHY the change was made. Explain motivation and context, not what the diff shows. Wrap lines at 72 characters.
- Do NOT write "DESCRIPTION: none", "DESCRIPTION: N/A", or any placeholder — omit the line entirely.
- For breaking changes, add "BREAKING CHANGE: <what breaks and how to migrate>" as the last line of DESCRIPTION.

Types:
  feat      new user-facing feature or capability
  fix       corrects a bug or unintended behavior
  refactor  restructures code without changing behavior
  perf      improves performance with no behavior change
  docs      documentation changes only
  style     whitespace, formatting, semicolons (no logic)
  test      add or modify tests
  chore     repo maintenance: scripts, config, editor files
  build     build toolchain or external dependency changes
  ci        CI/CD pipeline configuration

Examples:

Simple commit (no description needed):
  SUMMARY: feat(auth): add OAuth2 login with Google

  SUMMARY: fix(api): handle null response from payment gateway

  SUMMARY: build(deps): upgrade Vite from v5 to v6

Commit with description (non-obvious reason):
  SUMMARY: fix(payments): return 503 when card processor is unavailable
  DESCRIPTION: The payment API returns null instead of an error when the
  card processor is down. This caused an unhandled exception and a 500
  response. Now we detect the null, log the outage, and return a 503
  with a Retry-After header so clients can back off gracefully.

Commit with breaking change:
  SUMMARY: refactor(config): replace JSON config with TOML
  DESCRIPTION: TOML supports comments and is easier to maintain.
  BREAKING CHANGE: delete ~/.ai-commit.json and re-run \`aicommit config set\`.`;

export function parseMessage(content) {
  const summaryMatch = content.match(/^SUMMARY:\s*(.+)/m);
  const descMatch = content.match(/^DESCRIPTION:\s*([\s\S]+?)(?=\nSUMMARY:|\nBREAKING CHANGE:|$)/m);

  const rawDesc = descMatch ? descMatch[1].trim() : null;
  const description = rawDesc && !/^(none|n\/a|-|null|no description needed)$/i.test(rawDesc)
    ? rawDesc
    : null;

  return {
    summary: summaryMatch ? summaryMatch[1].trim() : content.split('\n')[0].trim(),
    description
  };
}

export function buildUserMessage(diff, stats) {
  let processedDiff = diff.trim();
  if (processedDiff.length > MAX_DIFF_LENGTH) {
    processedDiff = processedDiff.substring(0, MAX_DIFF_LENGTH) + '\n\n[... diff truncated ...]';
  }

  const parts = ['Generate a commit message for the following staged changes.'];
  if (stats) {
    parts.push(`Changed files:\n${stats.trim()}`);
  }
  parts.push(`Diff:\n${processedDiff}`);

  return parts.join('\n\n');
}

export async function generateCommitMessage(provider, diff, stats) {
  return await provider.generate(diff, stats);
}
