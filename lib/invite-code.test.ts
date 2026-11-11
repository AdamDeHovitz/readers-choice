import { describe, it, expect } from "vitest";
import { isWellFormedInviteCode } from "./invite-code";

describe("isWellFormedInviteCode", () => {
  it("accepts legacy 8-character codes", () => {
    expect(isWellFormedInviteCode("ab12cd34")).toBe(true);
  });

  it("rejects malformed input", () => {
    expect(isWellFormedInviteCode("")).toBe(false);
    expect(isWellFormedInviteCode("abc")).toBe(false);
    expect(isWellFormedInviteCode("a".repeat(65))).toBe(false);
    expect(isWellFormedInviteCode("abc/def%20")).toBe(false);
    expect(isWellFormedInviteCode(undefined)).toBe(false);
    expect(isWellFormedInviteCode(12345678)).toBe(false);
  });
});
