import { z } from "zod";
import { keys } from "./keys";
import { defineContract } from "./operation";
import { rowId } from "./schemas";

/**
 * Apps (Claude, ChatGPT, …) the user let act for them through the MCP
 * server. The MCP server never offers these as tools: an app shouldn't
 * manage its own access.
 */

const connectedApp = z.object({
  grantId: z.string(),
  /** The name the app gave itself. Unverified for registered apps. */
  clientName: z.string(),
  /** The domain the app's sign-in returns to, so look-alikes stand out. */
  clientHost: z.string().nullable(),
  /** Space-separated: "read", or "read write". */
  scope: z.string(),
  connectedAt: z.string(),
  lastUsedAt: z.string(),
});
export type ConnectedApp = z.output<typeof connectedApp>;

export const listConnectedApps = defineContract({
  name: "connectedApps.list",
  kind: "query",
  description:
    "List the apps the user has connected to their account, most recently used first.",
  input: z.object({}),
  output: z.object({ apps: z.array(connectedApp) }),
  cacheKey: () => keys.connectedApps(),
});

export const revokeConnectedApp = defineContract({
  name: "connectedApps.revoke",
  kind: "mutation",
  description:
    "Disconnect an app: its access stops at once and it must ask again.",
  input: z.object({ grantId: rowId }),
  output: z.void(),
});
