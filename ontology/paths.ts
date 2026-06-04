import { join } from "node:path";

/** Repository root when running CLI, gateway, or repo tests (cwd is usually repo root). */
export function repoRoot(): string {
  return process.env.DAEMON_REPO_ROOT ?? process.cwd();
}

export function configsPath(...segments: string[]): string {
  return join(repoRoot(), "configs", ...segments);
}
