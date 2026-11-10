import "server-only";
import { UserError } from "@/lib/user-error";
import { getViewer, type Viewer } from "./viewer";

/** What every server action returns to the client. */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export const UNAUTHORIZED = "Unauthorized";

/**
 * Run a server action body for the signed-in user.
 *
 * - Signed out: fails with "Unauthorized" without running `body`.
 * - `UserError`: fails with its (user-facing) message.
 * - Anything else: logged, and fails with `fallbackError` so database or
 *   network internals never reach the client.
 *
 * Every exported `"use server"` function is a public endpoint; `body` must
 * still authorize the viewer for the resource it touches (server/authz.ts).
 */
export async function runAction<T>(
  fallbackError: string,
  body: (viewer: Viewer) => Promise<T>
): Promise<ActionResult<T>> {
  const viewer = await getViewer();
  if (!viewer) return { success: false, error: UNAUTHORIZED };

  try {
    return { success: true, data: await body(viewer) };
  } catch (error) {
    if (error instanceof UserError) {
      return { success: false, error: error.message };
    }
    console.error(`${fallbackError}:`, error);
    return { success: false, error: fallbackError };
  }
}
