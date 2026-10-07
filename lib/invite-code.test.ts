import { describe, it, expect } from "vitest";
import { generateInviteCode, isWellFormedInviteCode } from "./invite-code";

describe("generateInviteCode", () => {
  it("produces 22-character URL-safe codes", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateInviteCode();
      expect(code).toMatch(/^[A-Za-z0-9_-]{22}$/);
      expect(encodeURIComponent(code)).toBe(code);
    }
  });

  it("does not repeat", () => {
    const codes = new Set(Array.from({ length: 1000 }, generateInviteCode));
    expect(codes.size).toBe(1000);
  });

  it("produces codes that pass the shape check", () => {
    expect(isWellFormedInviteCode(generateInviteCode())).toBe(true);
  });
});

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
