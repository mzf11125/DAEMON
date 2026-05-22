export function matchReferenceList(party: { partyId: string; email?: string }): string[] {
  if (!party.email) return [];
  if (party.email.endsWith("@demo.local")) {
    return [`internal:${party.partyId}`];
  }
  return [];
}
