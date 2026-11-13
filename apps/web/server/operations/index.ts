import "server-only";
import type { Operation } from "../operation";
import * as clubs from "./clubs";
import * as themes from "./themes";

/**
 * Every implemented operation, by domain, mirroring `contracts` in
 * contract/index.ts (a test keeps the two in step). Transports (server
 * actions and the HTTP API, app/_operations/) dispatch through here.
 */
export const operations = { clubs, themes };

const byName = new Map<string, Operation>(
  Object.values(operations).flatMap((domain) =>
    (Object.values(domain) as Operation[]).map((op) => [op.contract.name, op])
  )
);

/** Look up an operation by its contract name, e.g. "themes.suggest". */
export function findOperation(name: string): Operation | undefined {
  return byName.get(name);
}
