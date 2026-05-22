export function computeSignalPriority(
  signals: Array<{ signalId: string; severity?: string }>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of signals) {
    const sev = (s.severity ?? "low").toLowerCase();
    out[s.signalId] = sev === "high" ? "P1" : sev === "medium" ? "P2" : "P3";
  }
  return out;
}
