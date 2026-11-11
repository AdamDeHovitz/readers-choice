import { expect, it } from "vitest";
import { z } from "zod";
import { contracts } from "./index";
import type { OperationContract } from "./operation";

/**
 * The public API, as JSON Schema: every operation's name, kind, input and
 * output. A diff in `contracts.snapshot.json` is an API change, and installed
 * mobile apps keep calling the old shape, so review it as one: adding an
 * operation, an optional input field or an output field is safe; renaming or
 * removing anything, or tightening an input, needs a new operation name.
 *
 * After an intended change: `npx vitest run -u packages/contract`.
 */
it("matches the committed contract snapshot", async () => {
  const operations = Object.values(contracts)
    .flatMap((domain) => Object.values(domain) as OperationContract[])
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ name, kind, input, output }) => ({
      name,
      kind,
      input: z.toJSONSchema(input, { io: "input", unrepresentable: "any" }),
      output: z.toJSONSchema(output, { io: "output", unrepresentable: "any" }),
    }));
  await expect(JSON.stringify(operations, null, 2) + "\n").toMatchFileSnapshot(
    "contracts.snapshot.json"
  );
});
