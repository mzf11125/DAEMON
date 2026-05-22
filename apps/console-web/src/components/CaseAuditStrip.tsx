type AuditItem = {
  eventId?: string;
  actionType?: string;
  resourceType?: string;
  resourceId?: string;
  actorId?: string;
  createdAt?: string;
};

export function CaseAuditStrip({ items }: { items: AuditItem[] }) {
  if (items.length === 0) {
    return <p className="muted">No audit events for this case yet.</p>;
  }
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {items.map((ev) => (
        <li key={String(ev.eventId)} className="card" style={{ marginBottom: "0.5rem" }}>
          <strong>{String(ev.actionType)}</strong>
          <div className="muted" style={{ marginTop: "0.25rem", fontSize: "0.85rem" }}>
            {String(ev.createdAt ?? "")} · {String(ev.actorId ?? "system")}
          </div>
        </li>
      ))}
    </ul>
  );
}
