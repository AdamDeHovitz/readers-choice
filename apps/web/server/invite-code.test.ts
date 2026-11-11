import { describe, it, expect } from "vitest";
import { isWellFormedInviteCode } from "@readers-choice/core/invite-code";
import { generateInviteCode } from "./invite-code";

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
