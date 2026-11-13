import { expect, it } from "vitest";
import { z } from "zod";
import { contracts } from "./index";
import { keys } from "./keys";
import type { OperationContract } from "./operation";

/**
 * The public API: every operation's name, kind, cache key, and input and
 * output as JSON Schema, plus the shape of every cache key. A diff in `contracts.snapshot.json` is an API change, and installed
 * mobile apps keep calling the old shape, so review it as one: adding an
 * operation, an optional input field or an output field is safe; renaming or
 * removing anything, or tightening an input, needs a new operation name.
 *
 * After an intended change: `npx vitest run -u packages/contract`.
 */
/** Stand-in input whose every field reads as "<field>", to show key shapes. */
const placeholderInput = new Proxy(
  {},
  { get: (_, field) => `<${String(field)}>` }
) as never;

it("matches the committed contract snapshot", async () => {
  const operations = Object.values(contracts)
    .flatMap((domain) => Object.values(domain) as OperationContract[])
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ name, kind, input, output, cacheKey }) => ({
      name,
      kind,
      ...(cacheKey && { cacheKey: cacheKey(placeholderInput) }),
      input: z.toJSONSchema(input, { io: "input", unrepresentable: "any" }),
      output: z.toJSONSchema(output, { io: "output", unrepresentable: "any" }),
    }));
  const keyShapes = Object.fromEntries(
    Object.entries(keys).map(([name, build]) => [
      name,
      (build as (...args: string[]) => readonly string[])(
        ...Array.from({ length: build.length }, (_, i) => `<arg${i + 1}>`)
      ),
    ])
  );
  await expect(
    JSON.stringify({ keys: keyShapes, operations }, null, 2) + "\n"
  ).toMatchFileSnapshot("contracts.snapshot.json");
});
