import { describe, expect, it } from "vitest";
import { UserError } from "@readers-choice/core/user-error";
import { throwIfDbError } from "./errors";

describe("throwIfDbError", () => {
  it("does nothing without an error", () => {
    expect(() => throwIfDbError(null)).not.toThrow();
  });

  it("maps known database error codes to user-facing messages", () => {
    expect(() => throwIfDbError({ message: "last_admin" })).toThrow(
      new UserError("Cannot remove the last admin")
    );
  });

  it("rethrows unknown errors as-is so they stay internal", () => {
    const error = { message: "deadlock detected" };
    try {
      throwIfDbError(error);
      expect.unreachable();
    } catch (thrown) {
      expect(thrown).toBe(error);
      expect(thrown).not.toBeInstanceOf(UserError);
    }
  });
});
