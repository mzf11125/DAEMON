/**
 * npm/pnpm pass a literal `--` when forwarding args (`pnpm run dev -- --help`).
 * Commander treats tokens after `--` as commands, so strip the separator first.
 */
export function normalizeArgv(argv: string[]): string[] {
  const dashDash = argv.indexOf('--');
  if (dashDash === -1) {
    return argv;
  }
  return [...argv.slice(0, dashDash), ...argv.slice(dashDash + 1)];
}
