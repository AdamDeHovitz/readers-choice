import { describe, expect, it } from "vitest";
import { CORS_HEADERS, corsJson, preflight } from "./cors";

describe("CORS for /api/v1", () => {
  it("answers a preflight for bearer requests without allowing credentials", () => {
    const response = preflight();
    expect(response.status).toBe(204);
    expect(Object.fromEntries(response.headers)).toMatchObject({
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "Authorization, Content-Type",
    });
    // With credentials allowed, a third-party page could make the browser
    // send our session cookie and read the answer.
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    expect(CORS_HEADERS).not.toHaveProperty("Access-Control-Allow-Credentials");
  });

  it("adds the same headers to JSON responses", async () => {
    const response = corsJson({ ok: true }, 201);
    expect(response.status).toBe(201);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(await response.json()).toEqual({ ok: true });
  });
});
