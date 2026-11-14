import "server-only";
import type { Operation } from "../operation";
import * as clubs from "./clubs";
import * as connectedApps from "./connected-apps";
import * as invites from "./invites";
import * as themes from "./themes";

/**
 * Every implemented operation, by domain, mirroring `contracts` in
 * contract/index.ts (a test keeps the two in step). Transports (server
 * actions, the HTTP API and the MCP server, app/_operations/) dispatch
 * through here.
 */
export const operations = { clubs, connectedApps, invites, themes };

/**
 * What the MCP server doesn't offer as tools:
 * - connectedApps: an app connected over OAuth must not see or revoke
 *   connections, its own included.
 * - clubs.delete: irreversible, and the AI driving it reads text any club
 *   member wrote (theme names, descriptions), which could tell it to.
 */
const NOT_FOR_MCP = new Set<keyof typeof operations>(["connectedApps"]);
const OPERATIONS_NOT_FOR_MCP = new Set(["clubs.delete"]);

const all = (domains: (keyof typeof operations)[]) =>
  domains.flatMap((domain) => Object.values(operations[domain]) as Operation[]);

const byName = new Map<string, Operation>(
  all(Object.keys(operations) as (keyof typeof operations)[]).map((op) => [
    op.contract.name,
    op,
  ])
);

/** Look up an operation by its contract name, e.g. "themes.suggest". */
export function findOperation(name: string): Operation | undefined {
  return byName.get(name);
}

/** The operations the MCP server offers as tools, in a stable order. */
export const mcpOperations: readonly Operation[] = all(
  (Object.keys(operations) as (keyof typeof operations)[]).filter(
    (domain) => !NOT_FOR_MCP.has(domain)
  )
)
  .filter((op) => !OPERATIONS_NOT_FOR_MCP.has(op.contract.name))
  .sort((a, b) => a.contract.name.localeCompare(b.contract.name));
