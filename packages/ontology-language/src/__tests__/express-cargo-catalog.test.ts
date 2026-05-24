import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";

const packRoot = join(
  import.meta.dirname,
  "../../../../ontology/v2/examples/packs/logistics-express-cargo/catalog",
);

describe("logistics-express-cargo catalog", () => {
  it("documents 41 objects across four domains", () => {
    const objects = yaml.load(
      readFileSync(join(packRoot, "objects.yaml"), "utf8"),
    ) as { objects: Array<{ domain: string }> };
    expect(objects.objects).toHaveLength(41);
    const domains: Record<string, number> = {};
    for (const o of objects.objects) {
      domains[o.domain] = (domains[o.domain] ?? 0) + 1;
    }
    expect(domains.core).toBe(18);
    expect(domains.commercial).toBe(10);
    expect(domains.network).toBe(6);
    expect(domains.financial).toBe(7);
  });

  it("defines five junction links", () => {
    const links = yaml.load(readFileSync(join(packRoot, "links.yaml"), "utf8")) as {
      junctions: unknown[];
    };
    expect(links.junctions).toHaveLength(5);
  });
});
