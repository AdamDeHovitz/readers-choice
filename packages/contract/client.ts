import type { InputOf, OperationContract, OutputOf } from "./operation";
import type { OperationResponse } from "./result";

export interface OperationClientOptions {
  /** The site's origin, e.g. "https://readers-choice.vercel.app". */
  baseUrl: string;
  /** Extra headers per call, e.g. an Authorization header. */
  headers?: () => Record<string, string> | Promise<Record<string, string>>;
  fetch?: typeof fetch;
}

const UNREACHABLE = "Something went wrong. Please try again.";

/**
 * A typed client for /api/v1: `call(contracts.themes.suggestTheme, input)`
 * checks the input type and returns the operation's output type. Never
 * throws; network and server failures come back as `success: false`.
 */
export function createOperationClient({
  baseUrl,
  headers,
  fetch: fetchImpl = fetch,
}: OperationClientOptions) {
  return {
    async call<C extends OperationContract>(
      contract: C,
      input: InputOf<C>
    ): Promise<OperationResponse<OutputOf<C>>> {
      try {
        const response = await fetchImpl(
          `${baseUrl}/api/v1/${encodeURIComponent(contract.name)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(await headers?.()),
            },
            body: JSON.stringify(input ?? null),
          }
        );
        return (await response.json()) as OperationResponse<OutputOf<C>>;
      } catch {
        return {
          success: false,
          error: UNREACHABLE,
          code: "unavailable",
          invalidate: [],
        };
      }
    },
  };
}
