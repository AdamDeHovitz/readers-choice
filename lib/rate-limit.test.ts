import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  consumeRateLimit,
  getClientIp,
  rateLimitKey,
  type RateLimitRule,
} from "./rate-limit";

const rule: RateLimitRule = { scope: "test", limit: 3, windowSeconds: 60 };

function mockClient(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

describe("getClientIp", () => {
  it("uses the first x-forwarded-for entry", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.5, 10.0.0.1",
      "x-real-ip": "198.51.100.7",
    });
    expect(getClientIp(headers)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip", () => {
    expect(getClientIp(new Headers({ "x-real-ip": " 198.51.100.7 " }))).toBe(
      "198.51.100.7"
    );
  });

  it("falls back to a constant when no headers are present", () => {
    expect(getClientIp(new Headers())).toBe("unknown");
    expect(getClientIp(new Headers({ "x-forwarded-for": " , " }))).toBe(
      "unknown"
    );
  });
});

describe("rateLimitKey", () => {
  it("hashes the identifier and prefixes the scope", () => {
    const key = rateLimitKey("register:ip", "203.0.113.5");
    expect(key).toMatch(/^register:ip:[0-9a-f]{64}$/);
    expect(key).not.toContain("203.0.113.5");
  });

  it("is deterministic and identifier-specific", () => {
    expect(rateLimitKey("s", "a")).toBe(rateLimitKey("s", "a"));
    expect(rateLimitKey("s", "a")).not.toBe(rateLimitKey("s", "b"));
  });
});

describe("consumeRateLimit", () => {
  it("passes the hashed key and rule to the database function", async () => {
    const { client, rpc } = mockClient({ data: true, error: null });
    await consumeRateLimit(client, rule, "id");
    expect(rpc).toHaveBeenCalledWith("consume_rate_limit", {
      p_key: rateLimitKey("test", "id"),
      p_limit: 3,
      p_window_seconds: 60,
    });
  });

  it("allows when the database says so", async () => {
    const { client } = mockClient({ data: true, error: null });
    expect(await consumeRateLimit(client, rule, "id")).toBe(true);
  });

  it("blocks when the limit is exceeded", async () => {
    const { client } = mockClient({ data: false, error: null });
    expect(await consumeRateLimit(client, rule, "id")).toBe(false);
  });

  it("fails open on database errors", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = mockClient({ data: null, error: { message: "boom" } });
    expect(await consumeRateLimit(client, rule, "id")).toBe(true);
    spy.mockRestore();
  });
});
