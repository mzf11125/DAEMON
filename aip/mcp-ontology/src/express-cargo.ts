import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ontologyFetch } from "./services.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function repoRoot(): string {
  return resolve(__dirname, "../../..");
}

export type IntakeFixture = {
  fixtureId: string;
  documentType: string;
  customerAccountId: string;
  origin: string;
  destination: string;
  items: Array<{ description: string; quantity: number }>;
  weight: number;
  references: Record<string, string>;
  confidence: Record<string, number>;
};

export function loadIntakeFixture(fixtureId: string): IntakeFixture {
  const path = resolve(repoRoot(), `aip/evals/fixtures/intake/${fixtureId}.json`);
  if (!existsSync(path)) {
    throw new Error(`intake fixture not found: ${fixtureId}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as IntakeFixture;
}

export function buildIntakeProposal(fixture: IntakeFixture): Record<string, unknown> {
  const minConf = Math.min(...Object.values(fixture.confidence));
  const needsReview = minConf < 0.8;
  return {
    actionType: "CreateShipmentDraft",
    status: "proposed",
    requiresHumanApproval: true,
    parameters: {
      customerAccountId: fixture.customerAccountId,
      origin: fixture.origin,
      destination: fixture.destination,
      items: fixture.items,
      weight: fixture.weight,
      references: fixture.references,
      confidence: fixture.confidence,
    },
    reviewFlags: needsReview ? ["low_confidence_field"] : [],
    citations: [{ source: fixture.fixtureId, documentType: fixture.documentType }],
  };
}

type OntologyItem = { primaryKey?: string; properties?: Record<string, unknown> };

export async function buildSalesBrief(
  auth: string | undefined,
  customerAccountId: string,
  meetingDate?: string,
): Promise<Record<string, unknown>> {
  const types = ["CustomerAccount", "Activity", "AccountHealthScore", "Signal", "Shipment"] as const;
  const byType: Record<string, OntologyItem[]> = {};
  for (const objectType of types) {
    const data = (await ontologyFetch(`/v1/objects/${objectType}`, auth)) as { items?: OntologyItem[] };
    byType[objectType] = data.items ?? [];
  }

  const account =
    byType.CustomerAccount.find((a) => a.primaryKey === customerAccountId) ??
    byType.CustomerAccount.find((a) => String(a.properties?.customerAccountId) === customerAccountId);

  const activities = byType.Activity.filter(
    (a) => String(a.properties?.customerAccountId ?? "") === customerAccountId,
  );
  const health = byType.AccountHealthScore.find(
    (h) => String(h.properties?.customerAccountId ?? "") === customerAccountId,
  );
  const signals = byType.Signal.filter(
    (s) =>
      String(s.properties?.customerAccountId ?? "") === customerAccountId ||
      String(s.properties?.vertical ?? "") === "logistics-express-cargo",
  );
  const shipments = byType.Shipment.filter((s) => {
    const props = s.properties ?? {};
    return String(props.vertical ?? "") === "logistics-express-cargo";
  });

  const lastActivity = activities.sort((a, b) =>
    String(b.properties?.occurredAt ?? "").localeCompare(String(a.properties?.occurredAt ?? "")),
  )[0];

  const talkingPoints: string[] = [];
  if (health && String(health.properties?.churnRisk) === "elevated") {
    talkingPoints.push("Churn risk elevated — confirm service satisfaction and recovery plan.");
  }
  if (signals.some((s) => String(s.properties?.provenanceRuleId) === "express-champion-idle")) {
    talkingPoints.push("Champion idle signal open — validate stakeholder coverage.");
  }
  if (activities.length === 0 || !lastActivity) {
    talkingPoints.push("No recent activity on file — schedule discovery touch.");
  }

  const markdown = [
    `# Pre-meeting brief — ${String(account?.properties?.name ?? customerAccountId)}`,
    "",
    `Meeting date: ${meetingDate ?? new Date().toISOString().slice(0, 10)}`,
    "",
    "## Account summary",
    `- Tier: ${String(account?.properties?.tier ?? "—")}`,
    `- Status: ${String(account?.properties?.status ?? "—")}`,
    `- Health score: ${String(health?.properties?.score ?? "—")} (churn: ${String(health?.properties?.churnRisk ?? "—")})`,
    "",
    "## Recent activity (90d window)",
    lastActivity
      ? `- ${String(lastActivity.properties?.occurredAt ?? "—")}: ${String(lastActivity.properties?.summary ?? lastActivity.properties?.activityType ?? "activity")}`
      : "- No activities recorded",
    "",
    "## Open signals",
    ...signals.slice(0, 5).map(
      (s) => `- ${s.primaryKey}: ${String(s.properties?.summary ?? "—")} (${String(s.properties?.severity ?? "—")})`,
    ),
    "",
    "## Shipment context (pack vertical)",
    `- Active sim shipments in vertical: ${shipments.length}`,
    "",
    "## Talking points",
    ...talkingPoints.map((p) => `- ${p}`),
    "",
    "_Read-only brief — no mutations performed._",
  ].join("\n");

  return {
    customerAccountId,
    meetingDate: meetingDate ?? null,
    markdown,
    citations: [
      { objectType: "CustomerAccount", primaryKey: customerAccountId },
      ...activities.slice(0, 3).map((a) => ({ objectType: "Activity", primaryKey: a.primaryKey })),
      ...signals.slice(0, 3).map((s) => ({ objectType: "Signal", primaryKey: s.primaryKey })),
    ],
    readOnly: true,
  };
}
