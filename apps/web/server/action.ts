import "server-only";
import type { ActionResult } from "@readers-choice/contract/result";
import { settle, UNAUTHORIZED } from "./errors";
import { getViewer, type Viewer } from "./viewer";

/**
 * Run a server action body for the signed-in user. Signed out: fails with
 * "Unauthorized" without running `body`. Errors are mapped by `settle`.
 *
 * Every exported `"use server"` function is a public endpoint; `body` must
 * still authorize the viewer for the resource it touches (server/authz.ts).
 *
 * Domains moved to operations (server/operation.ts) don't use this; the rest
 * move over as they're touched (#75).
 */
export async function runAction<T>(
  fallbackError: string,
  body: (viewer: Viewer) => Promise<T>
): Promise<ActionResult<T>> {
  const viewer = await getViewer();
  if (!viewer) {
    return { success: false, error: UNAUTHORIZED, code: "unauthenticated" };
  }
  return settle(fallbackError, () => body(viewer));
}
