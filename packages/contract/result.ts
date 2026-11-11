import type { InvalidationKey } from "./keys";

/** What every operation returns to a client, on the web and on mobile. */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/** The JSON body of every /api/v1 response. */
export type OperationResponse<T = unknown> = ActionResult<T> & {
  /** Keys whose cached data is now stale (mobile: query keys to refetch). */
  invalidate: InvalidationKey[];
};
