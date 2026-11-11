import "server-only";
import { revalidatePath } from "next/cache";
import type { InvalidationKey } from "@/contract/keys";
import type {
  InputOf,
  OperationContract,
  OutputOf,
} from "@/contract/operation";
import type { ActionResult } from "@/contract/result";
import { executeOperation, type Operation } from "@/server/operation";
import { getViewer } from "@/server/viewer";

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
    for (const key of invalidated) {
      for (const path of pathsFor(key)) revalidatePath(path);
    }
    return result;
  };
}

/** The pages that show the data behind an invalidation key. */
function pathsFor(key: InvalidationKey): string[] {
  const [scope, id, part] = key;
  switch (`${scope}/${part}`) {
    case "club/themes":
      return [`/book-clubs/${id}/themes`];
    default:
      throw new Error(`No web paths for invalidation key ${key.join("/")}`);
  }
}
