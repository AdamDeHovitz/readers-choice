import type { ErrorCode } from "@readers-choice/contract/result";

/** A failed operation, thrown so TanStack Query treats it as an error. */
export class OperationError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string
  ) {
    super(message);
    this.name = "OperationError";
  }

  /** Worth retrying automatically: the server or network had a problem. */
  get transient() {
    return this.code === "unavailable" || this.code === "internal";
  }
}
