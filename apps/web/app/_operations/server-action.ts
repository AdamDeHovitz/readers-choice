import "server-only";
import type {
  InputOf,
  OperationContract,
  OutputOf,
} from "@readers-choice/contract/operation";
import type { ActionResult } from "@readers-choice/contract/result";
import { executeOperation, type Operation } from "@/server/operation";
import { getViewer } from "@/server/viewer";
import { revalidateKeys } from "./revalidate";

/**
 * Expose an operation as a server action. Use it from a `"use server"` file:
 *
 *     export const suggestTheme = serverAction(themes.suggestTheme);
 */
export function serverAction<C extends OperationContract>(
  operation: Operation<C>
): (input: InputOf<C>) => Promise<ActionResult<OutputOf<C>>> {
  return async (input) => {
    const { result, invalidated } = await executeOperation(
      operation,
      await getViewer(),
      input
    );
    revalidateKeys(invalidated);
    return result;
  };
}
