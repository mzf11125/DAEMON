export { ontologyManifestSchema, parseOntologyManifest, type OntologyManifest } from "./manifest-schema";

export const ONTOLOGY_DOMAIN = "enterprise-operations" as const;

export const OBJECT_TYPES = [
  "Organization",
  "Site",
  "Asset",
  "Party",
  "WorkOrder",
  "Observation",
  "Signal",
  "Case",
  "Decision",
] as const;

export type ObjectTypeName = (typeof OBJECT_TYPES)[number];

export const ACTION_TYPES = [
  "RecordObservation",
  "OpenCase",
  "AssignCase",
  "EscalateSignal",
  "ExecuteWorkOrder",
  "RecordDecision",
  "CloseCase",
] as const;
