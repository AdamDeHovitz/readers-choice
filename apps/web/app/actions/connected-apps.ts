"use server";

import * as connectedApps from "@/server/operations/connected-apps";
import { serverAction } from "@/app/_operations/server-action";

export const revokeConnectedApp = serverAction(
  connectedApps.revokeConnectedApp
);
