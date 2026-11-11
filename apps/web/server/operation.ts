import "server-only";
import type { InvalidationKey } from "@readers-choice/contract/keys";
import type {
  OperationContract,
  OutputOf,
  ParsedInputOf,
} from "@readers-choice/contract/operation";
import type { ActionResult } from "@readers-choice/contract/result";
import { settle, UNAUTHORIZED } from "./errors";
import type { Viewer } from "./viewer";

/** What an operation's implementation gets besides its input. */
export interface OperationContext extends Viewer {
  /** Mark cached data stale once the operation succeeds. */
  invalidate(...keys: InvalidationKey[]): void;
}

/** A contract plus its server-side implementation. */
export interface Operation<C extends OperationContract = OperationContract> {
  contract: C;
  /** Shown to the client for any error that isn't a UserError. */
  fallbackError: string;
  /**
   * Authorize the viewer (server/authz.ts), then call server/ for the work.
   * `input` has already passed the contract's schema.
   */
  run(ctx: OperationContext, input: ParsedInputOf<C>): Promise<OutputOf<C>>;
}

export function implement<C extends OperationContract>(
  contract: C,
  fallbackError: string,
  run: Operation<C>["run"]
): Operation<C> {
  return { contract, fallbackError, run };
}

export interface OperationOutcome<T> {
  result: ActionResult<T>;
  /** Keys the operation invalidated; empty unless it succeeded. */
  invalidated: InvalidationKey[];
  /**
   * Why the operation didn't run, for transports that report it (HTTP
   * status codes). Unset when it ran, whether it succeeded or failed.
   */
  rejected?: "unauthenticated" | "invalid-input";
}

/**
 * Run an operation for a viewer, whatever transport the call came in on.
 * The input is untrusted: it's parsed with the contract's schema first, and
 * the first problem is returned as the error.
 */
export async function executeOperation<C extends OperationContract>(
  operation: Operation<C>,
  viewer: Viewer | null,
  rawInput: unknown
): Promise<OperationOutcome<OutputOf<C>>> {
  if (!viewer) {
    return {
      result: { success: false, error: UNAUTHORIZED },
      invalidated: [],
      rejected: "unauthenticated",
    };
  }

  const parsed = operation.contract.input.safeParse(rawInput);
  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message ?? "Invalid input";
    return {
      result: { success: false, error },
      invalidated: [],
      rejected: "invalid-input",
    };
  }

  const invalidated: InvalidationKey[] = [];
  const context: OperationContext = {
    ...viewer,
    invalidate: (...keys) => invalidated.push(...keys),
  };
  const result = await settle(operation.fallbackError, () =>
    operation.run(context, parsed.data as ParsedInputOf<C>)
  );
  return { result, invalidated: result.success ? invalidated : [] };
}
