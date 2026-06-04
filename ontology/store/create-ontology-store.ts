import type { OntologyStore } from "@daemon/context-ports";
import { PostgresEntityJournal } from "@daemon/data-platform/operational-store/entity-journal";
import { OntologyRegistry } from "../registry/ontology-registry.js";
import { DurableOntologyStore } from "./durable-ontology-store.js";
import { replayInto } from "./replay-into.js";
import { loadFoundationPack } from "../packs/load-pack.js";

/**
 * Build ontology store: in-memory only, or durable journal + replay when Postgres is configured.
 */
export async function createOntologyStoreFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): Promise<OntologyStore> {
  const journal = PostgresEntityJournal.fromEnv(env);
  if (!journal) {
    return new OntologyRegistry();
  }
  const registry = new OntologyRegistry();
  await replayInto(registry, journal);
  const pack = loadFoundationPack();
  return new DurableOntologyStore(registry, journal, {
    packVersion: pack.manifest.version,
  });
}
