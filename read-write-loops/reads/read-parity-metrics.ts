import type { ReadParityReport } from "./read-parity.js";

function escapeLabel(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * In-process counters for projection vs registry read parity (staging rollout).
 */
export class ReadParityMetricsRegistry {
  private checks = 0;
  private matches = 0;
  private readonly mismatches = new Map<string, number>();

  record(report: ReadParityReport): void {
    this.checks += 1;
    if (report.status === "match") {
      this.matches += 1;
      return;
    }
    const reason = report.reason === "match" ? "unknown" : report.reason;
    this.mismatches.set(reason, (this.mismatches.get(reason) ?? 0) + 1);
  }

  snapshot(): {
    checks: number;
    matches: number;
    mismatches: Map<string, number>;
  } {
    return {
      checks: this.checks,
      matches: this.matches,
      mismatches: new Map(this.mismatches),
    };
  }

  reset(): void {
    this.checks = 0;
    this.matches = 0;
    this.mismatches.clear();
  }

  prometheusText(): string {
    const lines: string[] = [];
    lines.push("# HELP daemon_read_parity_checks_total Read parity comparisons (registry vs projection)");
    lines.push("# TYPE daemon_read_parity_checks_total counter");
    lines.push(`daemon_read_parity_checks_total ${this.checks}`);
    lines.push("# HELP daemon_read_parity_matches_total Read parity comparisons with matching snapshots");
    lines.push("# TYPE daemon_read_parity_matches_total counter");
    lines.push(`daemon_read_parity_matches_total ${this.matches}`);
    lines.push("# HELP daemon_read_parity_mismatch_total Read parity mismatches by reason");
    lines.push("# TYPE daemon_read_parity_mismatch_total counter");
    for (const [reason, count] of this.mismatches) {
      lines.push(
        `daemon_read_parity_mismatch_total{reason="${escapeLabel(reason)}"} ${count}`,
      );
    }
    return `${lines.join("\n")}\n`;
  }
}

export const globalReadParityMetrics = new ReadParityMetricsRegistry();
