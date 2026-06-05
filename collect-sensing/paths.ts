import { existsSync } from "node:fs";
import { join } from "node:path";

/** Repository root when running gateway, CLI, or repo tests. */
export function repoRoot(): string {
  return process.env.DAEMON_REPO_ROOT ?? process.cwd();
}

export function sourcesConfigPath(): string {
  return join(repoRoot(), "configs", "collect-sensing", "sources.yaml");
}

/** Primary catalog plus optional overlay files (e.g. ABC Express shadow sources). */
export function sourcesConfigPaths(): string[] {
  const dir = join(repoRoot(), "configs", "collect-sensing");
  const candidates = [
    join(dir, "sources.yaml"),
    join(dir, "sources.abc-express.yaml"),
  ];
  return candidates.filter((p) => existsSync(p));
}

export function resolveRepoPath(relativePath: string): string {
  return join(repoRoot(), relativePath);
}
