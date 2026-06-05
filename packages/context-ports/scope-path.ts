import { resolve, sep } from "node:path";
import type { OntologyScope } from "./ontology-store.js";

/** Safe tenant/domain path segments (no separators or traversal). */
export const SCOPE_SEGMENT_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function assertSafeScopeSegment(
  label: "tenantId" | "domainId",
  value: string,
): void {
  if (!SCOPE_SEGMENT_PATTERN.test(value)) {
    throw new Error(`invalid ${label}: ${value}`);
  }
}

export function assertSafeScope(scope: OntologyScope): void {
  assertSafeScopeSegment("tenantId", scope.tenantId);
  assertSafeScopeSegment("domainId", scope.domainId);
}

/**
 * Resolves path segments under root and rejects traversal outside root.
 */
export function resolveWithinDirectory(
  rootDir: string,
  ...segments: string[]
): string {
  for (const segment of segments) {
    if (
      segment.length === 0 ||
      segment === "." ||
      segment === ".." ||
      segment.includes(sep)
    ) {
      throw new Error(`invalid path segment: ${segment}`);
    }
  }
  const root = resolve(rootDir);
  const target = resolve(root, ...segments);
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error(`path escapes base directory: ${rootDir}`);
  }
  return target;
}
