import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

export type IntakeProposal = {
  actionType: string;
  status: string;
  requiresHumanApproval: boolean;
  parameters: {
    customerAccountId: string;
    origin: string;
    destination: string;
    items: IntakeFixture["items"];
    weight: number;
    references: Record<string, string>;
    confidence: Record<string, number>;
  };
  reviewFlags: string[];
  citations: Array<{ source: string; documentType: string }>;
};

export function loadIntakeFixture(fixtureId: string): IntakeFixture {
  const path = resolve(process.cwd(), "..", "..", "aip/evals/fixtures/intake", `${fixtureId}.json`);
  return JSON.parse(readFileSync(path, "utf8")) as IntakeFixture;
}

export function buildIntakeProposal(fixture: IntakeFixture): IntakeProposal {
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
