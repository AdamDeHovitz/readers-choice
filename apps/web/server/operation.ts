import "server-only";
import type { InvalidationKey } from "@readers-choice/contract/keys";
import type {
  ImplementationOutputOf,
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
   * `input` has already passed the contract's schema; the return value is
   * parsed with the output schema before it reaches the client.
   */
  run(
    ctx: OperationContext,
    input: ParsedInputOf<C>
  ): Promise<ImplementationOutputOf<C>>;
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
}

/**
 * Run an operation for a viewer, whatever transport the call came in on.
 *
 * The input is untrusted: it's parsed with the contract's schema first, and
 * the first problem is returned as the error. The output is parsed with the
 * contract's output schema, so clients only ever see declared fields. An
 * output that doesn't match is a server bug: it's logged and the client gets
 * the fallback error (the operation's writes have already happened).
 */
export async function executeOperation<C extends OperationContract>(
  operation: Operation<C>,
  viewer: Viewer | null,
  rawInput: unknown
): Promise<OperationOutcome<OutputOf<C>>> {
  if (!viewer) {
    return {
      result: { success: false, error: UNAUTHORIZED, code: "unauthenticated" },
      invalidated: [],
    };
  }

  const { contract, fallbackError } = operation;
  const parsed = contract.input.safeParse(rawInput);
  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message ?? "Invalid input";
    return {
      result: { success: false, error, code: "invalid_input" },
      invalidated: [],
    };
  }

  const invalidated: InvalidationKey[] = [];
  const context: OperationContext = {
    ...viewer,
    invalidate: (...keys) => invalidated.push(...keys),
  };
  const result = await settle(fallbackError, () =>
    operation.run(context, parsed.data as ParsedInputOf<C>)
  );
  if (!result.success) return { result, invalidated: [] };

  const output = contract.output.safeParse(result.data);
  if (!output.success) {
    console.error(
      `${contract.name} returned output that doesn't match its contract:`,
      output.error.issues
    );
    // The writes happened, so stale data is still stale.
    return {
      result: { success: false, error: fallbackError, code: "internal" },
      invalidated,
    };
  }
  return {
    result: { success: true, data: output.data as OutputOf<C> },
    invalidated,
  };
}
