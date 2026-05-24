import Link from "next/link";
import { createDaemonClient } from "@/lib/daemon-client";
import { getDevBearer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PACK = "logistics-express-cargo";

type OntologyRow = { primaryKey: string; properties: Record<string, unknown> };

function buildBriefMarkdown(
  accountId: string,
  account: OntologyRow | undefined,
  activities: OntologyRow[],
  health: OntologyRow | undefined,
  signals: OntologyRow[],
  shipmentCount: number,
  meetingDate: string,
): string {
  const lastActivity = [...activities].sort((a, b) =>
    String(b.properties?.occurredAt ?? "").localeCompare(String(a.properties?.occurredAt ?? "")),
  )[0];
  const talkingPoints: string[] = [];
  if (health && String(health.properties?.churnRisk) === "elevated") {
    talkingPoints.push("Churn risk elevated — confirm service satisfaction and recovery plan.");
  }
  if (signals.some((s) => String(s.properties?.provenanceRuleId) === "express-champion-idle")) {
    talkingPoints.push("Champion idle signal open — validate stakeholder coverage.");
  }
  if (!lastActivity) {
    talkingPoints.push("No recent activity on file — schedule discovery touch.");
  }

  return [
    `# Pre-meeting brief — ${String(account?.properties?.name ?? accountId)}`,
    "",
    `Meeting date: ${meetingDate}`,
    "",
    "## Account summary",
    `- Tier: ${String(account?.properties?.tier ?? "—")}`,
    `- Status: ${String(account?.properties?.status ?? "—")}`,
    `- Health score: ${String(health?.properties?.score ?? "—")} (churn: ${String(health?.properties?.churnRisk ?? "—")})`,
    "",
    "## Recent activity",
    lastActivity
      ? `- ${String(lastActivity.properties?.occurredAt ?? "—")}: ${String(lastActivity.properties?.summary ?? lastActivity.properties?.activityType ?? "activity")}`
      : "- No activities recorded",
    "",
    "## Open signals (sample)",
    ...signals.slice(0, 5).map(
      (s) => `- ${s.primaryKey}: ${String(s.properties?.summary ?? "—")} (${String(s.properties?.severity ?? "—")})`,
    ),
    "",
    `## Shipment context`,
    `- Sim shipments in ${PACK}: ${shipmentCount}`,
    "",
    "## Talking points",
    ...talkingPoints.map((p) => `- ${p}`),
    "",
    "_Read-only brief — generated from ontology objects; no mutations._",
  ].join("\n");
}

export default async function ExpressCargoAccountBriefPage({
  params,
  searchParams,
}: {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{ meetingDate?: string }>;
}) {
  const { accountId } = await params;
  const sp = await searchParams;
  const meetingDate = sp.meetingDate ?? new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const bearer = session?.access_token ?? getDevBearer();
  const client = createDaemonClient(bearer);

  let markdown = "";
  let error: string | null = null;

  try {
    const [acctRes, actRes, healthRes, sigRes, shipRes] = await Promise.all([
      client.listObjects("CustomerAccount", { limit: 100 }),
      client.listObjects("Activity", { limit: 100 }),
      client.listObjects("AccountHealthScore", { limit: 100 }),
      client.listObjects("Signal", { limit: 100 }),
      client.listObjects("Shipment", { limit: 100 }),
    ]);
    const accounts = acctRes.items ?? [];
    const account =
      accounts.find((a) => a.primaryKey === accountId) ??
      accounts.find((a) => String(a.properties?.customerAccountId) === accountId);
    const activities = (actRes.items ?? []).filter(
      (a) => String(a.properties?.customerAccountId ?? "") === accountId,
    );
    const health = (healthRes.items ?? []).find(
      (h) => String(h.properties?.customerAccountId ?? "") === accountId,
    );
    const signals = (sigRes.items ?? []).filter(
      (s) =>
        String(s.properties?.customerAccountId ?? "") === accountId ||
        String(s.properties?.vertical ?? "") === PACK,
    );
    const shipments = (shipRes.items ?? []).filter(
      (s) => String(s.properties?.vertical ?? "") === PACK,
    );
    markdown = buildBriefMarkdown(
      accountId,
      account,
      activities,
      health,
      signals,
      shipments.length,
      meetingDate,
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to build brief";
  }

  return (
    <main>
      <p>
        <Link href="/express-cargo">← Express cargo ops</Link>
      </p>
      <h1>Sales co-pilot brief</h1>
      <p className="muted">
        Account {accountId} · read-only · pack {PACK}
      </p>
      {error && <p className="muted">API error: {error}</p>}
      {!error && (
        <pre
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            background: "var(--card-bg, #111)",
            borderRadius: "8px",
            whiteSpace: "pre-wrap",
            fontSize: "0.9rem",
          }}
        >
          {markdown}
        </pre>
      )}
    </main>
  );
}
