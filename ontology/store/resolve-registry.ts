import type { OntologyStore } from "@daemon/context-ports";
import { OntologyRegistry } from "../registry/ontology-registry.js";
import { DurableOntologyStore } from "./durable-ontology-store.js";

function isOntologyRegistry(store: OntologyStore): store is OntologyRegistry {
  return (
    typeof (store as OntologyRegistry).subscribeEvents === "function" &&
    typeof (store as OntologyRegistry).register === "function"
  );
}

/** Returns the in-memory registry backing a store, if available. */
export function resolveOntologyRegistry(
  store: OntologyStore,
): OntologyRegistry | undefined {
  if (store instanceof DurableOntologyStore) {
    return store.innerRegistry();
  }
  if (isOntologyRegistry(store)) {
    return store;
  }
  return undefined;
}
