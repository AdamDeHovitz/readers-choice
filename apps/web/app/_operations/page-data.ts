import "server-only";
import { redirect } from "next/navigation";
import type {
  InputOf,
  OperationContract,
  OutputOf,
} from "@readers-choice/contract/operation";
import { executeOperation, type Operation } from "@/server/operation";
import { getViewer } from "@/server/viewer";

/**
 * Load a page's data through a query operation: the same call, rules and
 * output the mobile app gets over /api/v1.
 *
 * Signed-out viewers go to /login. When the operation refuses (not a
 * member, a malformed id in the URL…), `onRefused` decides where to send
 * them. Unexpected errors throw, so the route's error boundary shows them.
 */
export async function loadPageData<C extends OperationContract>(
  operation: Operation<C>,
  input: InputOf<C>,
  { onRefused }: { onRefused: () => never }
): Promise<OutputOf<C>> {
  const { result } = await executeOperation(
    operation,
    await getViewer(),
    input
  );
  if (result.success) return result.data;
  switch (result.code) {
    case "unauthenticated":
      redirect("/login");
    case "refused":
    case "invalid_input":
      return onRefused();
    default:
      throw new Error(result.error);
  }
}
