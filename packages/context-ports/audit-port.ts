/** Audit port for loop and gateway write paths. */
export interface AuditEvent {
  at: string;
  action: string;
  subjectId: string;
  resource: string;
  outcome: "allow" | "deny";
  tenantId?: string;
  domainId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditPort {
  record(event: Omit<AuditEvent, "at"> & { at?: string }): void;
  list(limit?: number): AuditEvent[];
}
