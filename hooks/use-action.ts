"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/server/action";

const NETWORK_ERROR = "Something went wrong. Please try again.";

interface UseActionOptions<Args extends unknown[], T> {
  /** Runs after a successful call, e.g. to close a dialog or navigate. */
  onSuccess?: (data: T, ...args: Args) => void;
  /** Re-render the page's server data after success (default true). */
  refresh?: boolean;
}

/**
 * Call a server action from a client component.
 *
 * `pending` stays true until the action and the follow-up refresh finish,
 * `error` holds the last failure's message, and `run` resolves to the
 * action's result. A request that never reaches the server is reported as
 * an error result instead of throwing.
 */
export function useAction<Args extends unknown[], T>(
  action: (...args: Args) => Promise<ActionResult<T>>,
  { onSuccess, refresh = true }: UseActionOptions<Args, T> = {}
) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    (...args: Args) =>
      new Promise<ActionResult<T>>((resolve) => {
        setError(null);
        startTransition(async () => {
          let result: ActionResult<T>;
          try {
            result = await action(...args);
          } catch (cause) {
            console.error(cause);
            result = { success: false, error: NETWORK_ERROR };
          }

          if (result.success) {
            onSuccess?.(result.data, ...args);
            if (refresh) router.refresh();
          } else {
            setError(result.error);
          }
          resolve(result);
        });
      }),
    [action, onSuccess, refresh, router]
  );

  const reset = useCallback(() => setError(null), []);

  return { run, pending, error, reset };
}
