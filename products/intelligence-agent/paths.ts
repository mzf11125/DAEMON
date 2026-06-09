/** Spec: products/intelligence-agent/paths.ts | BigPlan Phase 0.1 */
import { join } from "node:path";

/** Repository root when running gateway, CLI, or repo tests. */
export function repoRoot(): string {
  return process.env.DAEMON_REPO_ROOT ?? process.cwd();
}

export function intelligenceAgentRoot(): string {
  return join(repoRoot(), "products", "intelligence-agent");
}

export function skillsPath(...segments: string[]): string {
  return join(intelligenceAgentRoot(), "skills", ...segments);
}

export function memoryPath(...segments: string[]): string {
  return join(intelligenceAgentRoot(), "memory", ...segments);
}

export function ydcIntelligenceConfigPath(): string {
  return join(repoRoot(), "sources", "ydc-intelligence.yaml");
}
