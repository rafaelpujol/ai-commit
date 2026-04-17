const MAX_DIFF_LENGTH = 10000;

export async function generateCommitMessage(provider, diff) {
  let processedDiff = diff.trim();
  
  if (processedDiff.length > MAX_DIFF_LENGTH) {
    processedDiff = processedDiff.substring(0, MAX_DIFF_LENGTH) + '\n\n[... diff truncated ...]';
  }

  return await provider.generate(processedDiff);
}
