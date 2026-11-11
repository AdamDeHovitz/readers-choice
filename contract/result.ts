/** What every operation returns to a client, on the web and on mobile. */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
