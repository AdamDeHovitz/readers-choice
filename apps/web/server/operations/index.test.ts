import { describe, expect, it } from "vitest";
import { contracts } from "@readers-choice/contract";
import { operations } from ".";

describe("operations", () => {
  it("implements every contract, under the same domain and export name", () => {
    const shape = (registry: Record<string, Record<string, unknown>>) =>
      Object.fromEntries(
        Object.entries(registry).map(([domain, ops]) => [
          domain,
          Object.keys(ops).sort(),
        ])
      );
    expect(shape(operations)).toEqual(shape(contracts));

    for (const [domain, ops] of Object.entries(operations)) {
      for (const [name, op] of Object.entries(ops)) {
        const declared = (contracts as Record<string, Record<string, unknown>>)[
          domain
        ][name];
        expect(op.contract, `${domain}.${name}`).toBe(declared);
      }
    }
  });

  it("gives every operation a unique name", () => {
    const names = Object.values(contracts).flatMap((ops) =>
      Object.values(ops).map((c) => c.name)
    );
    expect(new Set(names).size).toBe(names.length);
  });
});
