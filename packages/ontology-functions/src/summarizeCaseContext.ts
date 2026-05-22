export function summarizeCaseContext(input: {
  caseId: string;
  title: string;
  signalIds?: string[];
}): string {
  const signals = input.signalIds?.length ? input.signalIds.join(", ") : "none";
  return `Case ${input.caseId}: ${input.title}. Linked signals: ${signals}.`;
}
