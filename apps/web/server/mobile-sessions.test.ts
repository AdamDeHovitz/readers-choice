import { beforeAll, describe, expect, it } from "vitest";
import { decodeJwt } from "jose";
import { fakeDb } from "@/test/fake-db";
import {
  endSession,
  hashToken,
  refreshSession,
  startSession,
  verifyAccessToken,
} from "./mobile-sessions";

const user = { id: "user-1", name: "Bob", email: "bob@example.test" };
const NOW = new Date("2026-11-11T12:00:00Z");

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-at-least-32-characters-long";
});

const insertedRow = (chain: string[]) =>
  JSON.parse(chain.find((c) => c.startsWith("insert("))!.slice(7, -1));
const updatedRow = (chain: string[]) =>
  JSON.parse(chain.find((c) => c.startsWith("update("))!.slice(7, -1));

describe("startSession", () => {
  it("stores only the refresh token's hash and signs a 15-minute access token", async () => {
    const { db, calls } = fakeDb([{ data: { id: "session-1" } }]);
    const session = await startSession(db, user, "Bob's iPhone", NOW);

    const row = insertedRow(calls[0]);
    expect(row).toMatchObject({
      user_id: "user-1",
      refresh_token_hash: hashToken(session.refreshToken),
      device_name: "Bob's iPhone",
    });
    expect(JSON.stringify(calls)).not.toContain(session.refreshToken);
    expect(session.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(session.user).toEqual(user);
    expect(session.accessTokenExpiresAt).toBe("2026-11-11T12:15:00.000Z");
    expect(decodeJwt(session.accessToken)).toMatchObject({
      sub: "user-1",
      sid: "session-1",
      name: "Bob",
      aud: "readers-choice-mobile",
    });
  });
});

describe("verifyAccessToken", () => {
  it("accepts a fresh token and rejects tampered, foreign or expired ones", async () => {
    const { db } = fakeDb([{ data: { id: "session-1" } }]);
    const { accessToken } = await startSession(db, user, undefined);
    expect(await verifyAccessToken(accessToken)).toEqual({
      userId: "user-1",
      name: "Bob",
      sessionId: "session-1",
    });

    const [head, body, sig] = accessToken.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...decodeJwt(accessToken), sub: "admin" })
    ).toString("base64url");
    expect(await verifyAccessToken(`${head}.${forged}.${sig}`)).toBeNull();
    expect(await verifyAccessToken(`${head}.${body}.x${sig}`)).toBeNull();
    expect(await verifyAccessToken("not-a-jwt")).toBeNull();

    const old = await startSession(
      fakeDb([{ data: { id: "s" } }]).db,
      user,
      undefined,
      new Date("2026-01-01")
    );
    expect(await verifyAccessToken(old.accessToken)).toBeNull();

    process.env.AUTH_SECRET = "a-different-secret-also-32-characters-x";
    expect(await verifyAccessToken(accessToken)).toBeNull();
    process.env.AUTH_SECRET = "test-secret-at-least-32-characters-long";
  });
});

describe("refreshSession", () => {
  it("rotates the token with a compare-and-swap on the presented hash", async () => {
    const { db, calls } = fakeDb([{ data: { id: "session-1", users: user } }]);
    const session = await refreshSession(db, "old-token", NOW);

    expect(session.refreshToken).not.toBe("old-token");
    expect(updatedRow(calls[0])).toMatchObject({
      refresh_token_hash: hashToken(session.refreshToken),
      previous_token_hash: hashToken("old-token"),
      last_used_at: NOW.toISOString(),
    });
    expect(calls[0]).toContain(
      `eq("refresh_token_hash", "${hashToken("old-token")}")`
    );
    expect(calls[0]).toContain('is("revoked_at", null)');
    // Sessions idle for 90 days are dead.
    expect(calls[0]).toContain(
      'gt("last_used_at", "2026-08-13T12:00:00.000Z")'
    );
    expect(decodeJwt(session.accessToken).sid).toBe("session-1");
  });

  it("refuses an unknown or expired token", async () => {
    const { db, calls } = fakeDb([{ data: null }, { data: null }]);
    await expect(refreshSession(db, "nope", NOW)).rejects.toThrow(
      "Your session has ended. Please sign in again."
    );
    expect(calls).toHaveLength(2);
  });

  it("treats a just-replaced token as a concurrent refresh, without revoking", async () => {
    const rotatedAt = new Date(NOW.getTime() - 30_000).toISOString();
    const { db, calls } = fakeDb([
      { data: null },
      { data: { id: "session-1", rotated_at: rotatedAt, revoked_at: null } },
    ]);
    await expect(refreshSession(db, "old-token", NOW)).rejects.toThrow(
      "This session was just refreshed. Use the newest refresh token."
    );
    expect(calls).toHaveLength(2);
  });

  it("revokes the session when a replaced token is replayed later", async () => {
    const rotatedAt = new Date(NOW.getTime() - 5 * 60_000).toISOString();
    const { db, calls } = fakeDb([
      { data: null },
      { data: { id: "session-1", rotated_at: rotatedAt, revoked_at: null } },
      {},
    ]);
    await expect(refreshSession(db, "stolen", NOW)).rejects.toThrow(
      "Your session has ended. Please sign in again."
    );
    expect(updatedRow(calls[2])).toEqual({ revoked_at: NOW.toISOString() });
    expect(calls[2]).toContain('eq("id", "session-1")');
  });
});

describe("endSession", () => {
  it("revokes the session holding the token", async () => {
    const { db, calls } = fakeDb([{}]);
    await endSession(db, "token", NOW);
    expect(updatedRow(calls[0])).toEqual({ revoked_at: NOW.toISOString() });
    expect(calls[0]).toContain(
      `eq("refresh_token_hash", "${hashToken("token")}")`
    );
  });
});
