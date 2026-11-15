import { describe, expect, it } from "vitest";
import { isLocalPath } from "./local-path";
import {
  chosenScopes,
  formatScope,
  grantableScopes,
  isAllowedRedirectUri,
  redirectUriMatches,
} from "./oauth";

describe("grantableScopes", () => {
  it("offers everything when nothing is asked", () => {
    expect(grantableScopes(null)).toEqual(["read", "write", "admin"]);
    expect(grantableScopes("  ")).toEqual(["read", "write", "admin"]);
  });

  it("always includes read and drops unknown scopes", () => {
    expect(grantableScopes("write")).toEqual(["read", "write"]);
    expect(grantableScopes("profile openid")).toEqual(["read"]);
    expect(grantableScopes("read")).toEqual(["read"]);
  });

  it("formats in canonical order", () => {
    expect(formatScope(["admin", "write", "read", "bogus"])).toBe(
      "read write admin"
    );
  });
});

describe("chosenScopes", () => {
  const all = ["read", "write", "admin"] as const;

  it("keeps what the user allowed", () => {
    expect(chosenScopes(all, { write: true, admin: false })).toEqual([
      "read",
      "write",
    ]);
    expect(chosenScopes(all, { write: true, admin: true })).toEqual(all);
  });

  it("drops admin without write, and never adds what wasn't asked", () => {
    expect(chosenScopes(all, { write: false, admin: true })).toEqual(["read"]);
    expect(chosenScopes(["read"], { write: true, admin: true })).toEqual([
      "read",
    ]);
  });
});

describe("isAllowedRedirectUri", () => {
  it.each([
    "https://claude.ai/api/mcp/auth_callback",
    "http://localhost:6274/oauth/callback",
    "http://127.0.0.1:33418/callback",
    "http://[::1]:8080/cb",
  ])("allows %s", (uri) => {
    expect(isAllowedRedirectUri(uri)).toBe(true);
  });

  it.each([
    "http://example.com/callback",
    "https://example.com/cb#frag",
    "https://user:pass@example.com/cb",
    "javascript:alert(1)",
    "cursor://callback",
    "http://localhost.evil.com/cb",
    "not a url",
  ])("refuses %s", (uri) => {
    expect(isAllowedRedirectUri(uri)).toBe(false);
  });
});

describe("redirectUriMatches", () => {
  it("matches HTTPS URIs exactly", () => {
    const registered = "https://app.example/cb";
    expect(redirectUriMatches(registered, registered)).toBe(true);
    expect(redirectUriMatches(registered, "https://app.example/cb/")).toBe(
      false
    );
    expect(redirectUriMatches(registered, "https://app.example/cb?x=1")).toBe(
      false
    );
  });

  it("lets a loopback redirect change only its port", () => {
    const registered = "http://127.0.0.1:1000/callback";
    expect(
      redirectUriMatches(registered, "http://127.0.0.1:5555/callback")
    ).toBe(true);
    expect(redirectUriMatches(registered, "http://127.0.0.1:5555/other")).toBe(
      false
    );
    expect(
      redirectUriMatches(registered, "http://localhost:5555/callback")
    ).toBe(false);
  });
});

describe("isLocalPath", () => {
  it.each(["/dashboard", "/oauth/authorize?client_id=x"])("allows %s", (p) => {
    expect(isLocalPath(p)).toBe(true);
  });

  it.each([
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "https://evil.com",
    "dashboard",
  ])("refuses %s", (p) => {
    expect(isLocalPath(p)).toBe(false);
  });
});
