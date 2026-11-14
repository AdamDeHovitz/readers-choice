import "server-only";
import * as contract from "@readers-choice/contract/connected-apps";
import { keys } from "@readers-choice/contract/keys";
import { implement } from "../operation";
import * as grants from "../oauth/grants";

// Only ever the viewer's own grants: both queries filter by ctx.userId.

export const listConnectedApps = implement(
  contract.listConnectedApps,
  "Failed to load connected apps",
  async (ctx) => ({
    apps: await grants.listConnectedApps(ctx.db, ctx.userId),
  })
);

export const revokeConnectedApp = implement(
  contract.revokeConnectedApp,
  "Failed to disconnect the app",
  async (ctx, { grantId }) => {
    await grants.revokeUserGrant(ctx.db, ctx.userId, grantId);
    ctx.invalidate(keys.connectedApps());
  }
);
