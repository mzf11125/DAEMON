import { z } from "zod";

export const ontologyManifestSchema = z.object({
  version: z.string(),
  domain: z.string(),
  description: z.string().optional(),
  defaultPack: z.string().nullable().optional(),
  availablePacks: z.array(z.string()).optional(),
  objectTypes: z.array(z.string()).min(1),
  linkTypes: z.array(z.string()),
  actionTypes: z.array(z.string()),
  functions: z.array(z.string()),
  backingDatasets: z.record(z.string()).optional(),
});

export type OntologyManifest = z.infer<typeof ontologyManifestSchema>;

export function parseOntologyManifest(data: unknown): OntologyManifest {
  return ontologyManifestSchema.parse(data);
}
