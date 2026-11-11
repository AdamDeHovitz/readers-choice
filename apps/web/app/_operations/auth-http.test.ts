import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { fakeDb } from "@/test/fake-db";

const { state } = vi.hoisted(() => ({
  state: { db: null as unknown, google: null as unknown },
}));
vi.mock("@/server/db", () => ({ createAdminClient: () => state.db }));
vi.mock("@/server/google-id-token", () => ({
  verifyGoogleIdToken: async () => state.google,
}));

import { googleSignIn, passwordSignIn, refresh, signOut } from "./auth-http";
import { verifyAccessToken } from "@/server/mobile-sessions";

const post = (body: unknown, contentType = "application/json") =>
  new Request("https://site.example/api/v1/auth/x", {
    method: "POST",
    headers: { "content-type": contentType, "x-forwarded-for": "1.2.3.4" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const allowed = { data: true };
const blocked = { data: false };
let hash: string;

beforeAll(async () => {
  process.env.AUTH_SECRET = "test-secret-at-least-32-characters-long";
  hash = await bcrypt.hash("password123", 4);
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

function useDb(results: Parameters<typeof fakeDb>[0]) {
  const fake = fakeDb(results);
  state.db = fake.db;
  return fake;
}

const bob = () => ({
  data: {
    id: "user-1",
    email: "bob@example.test",
    name: "Bob",
    avatar_url: null,
    google_id: null,
    password_hash: hash,
  },
});

async function send(
  handler: (r: Request) => Promise<Response>,
  request: Request
) {
  const response = await handler(request);
  return { status: response.status, body: await response.json() };
}

describe("passwordSignIn", () => {
  it("signs in with the right password and returns a usable session", async () => {
    const { calls } = useDb([
      allowed,
      allowed,
      bob(),
      { data: { id: "session-1" } },
    ]);
    const { status, body } = await send(
      passwordSignIn,
      post({
        email: " Bob@Example.test ",
        password: "password123",
        deviceName: "iPhone",
      })
    );
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.user).toEqual({
      id: "user-1",
      name: "Bob",
      email: "bob@example.test",
    });
    expect(await verifyAccessToken(body.data.accessToken)).toEqual({
      userId: "user-1",
      name: "Bob",
      sessionId: "session-1",
    });
    expect(calls[2]).toContain('eq("email", "bob@example.test")');
  });

  it("gives the same answer for a wrong password, an unknown email and a Google-only account", async () => {
    const wrong = {
      success: false,
      error: "Incorrect email or password",
      code: "refused",
    };
    useDb([allowed, allowed, bob()]);
    expect(
      await send(
        passwordSignIn,
        post({ email: "bob@example.test", password: "nope" })
      )
    ).toEqual({ status: 401, body: wrong });
    useDb([allowed, allowed, { data: null }]);
    expect(
      await send(
        passwordSignIn,
        post({ email: "x@example.test", password: "nope" })
      )
    ).toEqual({ status: 401, body: wrong });
    useDb([allowed, allowed, { data: { ...bob().data, password_hash: null } }]);
    expect(
      await send(
        passwordSignIn,
        post({ email: "bob@example.test", password: "password123" })
      )
    ).toEqual({ status: 401, body: wrong });
  });

  it("rate-limits by IP before reading the body, then by email", async () => {
    const { calls } = useDb([blocked]);
    expect(await send(passwordSignIn, post("{not json"))).toEqual({
      status: 429,
      body: {
        success: false,
        error: "Too many attempts. Please try again later.",
        code: "rate_limited",
      },
    });
    expect(calls).toHaveLength(1);

    const second = useDb([allowed, blocked]);
    expect(
      (
        await send(
          passwordSignIn,
          post({ email: "bob@example.test", password: "x" })
        )
      ).status
    ).toBe(429);
    expect(second.calls).toHaveLength(2);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("rejects bad bodies before touching accounts", async () => {
    const { calls } = useDb([allowed, allowed, allowed]);
    expect(
      (await send(passwordSignIn, post({ email: "bob@example.test" }))).body
    ).toEqual({
      success: false,
      error: "Invalid input: expected string, received undefined",
      code: "invalid_input",
    });
    expect(
      (
        await send(
          passwordSignIn,
          post("email=x", "application/x-www-form-urlencoded")
        )
      ).status
    ).toBe(400);
    expect((await send(passwordSignIn, post("{"))).status).toBe(400);
    expect(calls).toHaveLength(3);
  });
});

describe("googleSignIn", () => {
  it("rejects a token that doesn't verify", async () => {
    state.google = null;
    const { calls } = useDb([allowed]);
    expect(await send(googleSignIn, post({ idToken: "x" }))).toEqual({
      status: 401,
      body: {
        success: false,
        error: "Google sign-in failed. Please try again.",
        code: "refused",
      },
    });
    expect(calls).toHaveLength(1);
  });

  it("links or creates the account like the web, then starts a session", async () => {
    state.google = {
      googleId: "g-1",
      email: "bob@example.test",
      name: "Bob",
      image: null,
    };
    const { calls } = useDb([
      allowed,
      bob(), // upsertGoogleAccount: existing account
      {}, // ...linked
      bob(), // account lookup
      { data: { id: "session-2" } },
    ]);
    const { status, body } = await send(
      googleSignIn,
      post({ idToken: "valid" })
    );
    expect(status).toBe(200);
    expect(body.data.user.id).toBe("user-1");
    expect(calls[2].join(" ")).toContain('"google_id":"g-1"');
  });
});

describe("refresh and signOut", () => {
  it("returns refused for a dead refresh token", async () => {
    useDb([allowed, { data: null }, { data: null }]);
    expect(await send(refresh, post({ refreshToken: "dead" }))).toEqual({
      status: 401,
      body: {
        success: false,
        error: "Your session has ended. Please sign in again.",
        code: "refused",
      },
    });
  });

  it("signs out idempotently", async () => {
    useDb([allowed, {}]);
    expect(await send(signOut, post({ refreshToken: "t" }))).toEqual({
      status: 200,
      body: { success: true },
    });
  });
});
