import { beforeAll, describe, expect, it, vi } from "vitest";

const { session } = vi.hoisted(() => ({
  session: { current: null as unknown },
}));
vi.mock("@/auth", () => ({ auth: async () => session.current }));
vi.mock("./db", () => ({ createAdminClient: () => ({}) }));

import { fakeDb } from "@/test/fake-db";
import { startSession } from "./mobile-sessions";
import { getRequestViewer } from "./viewer";

const request = (authorization?: string) =>
  new Request("https://site.example/api/v1/themes.list", {
    method: "POST",
    headers: authorization ? { authorization } : {},
  });

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-at-least-32-characters-long";
});

describe("getRequestViewer", () => {
  it("uses a valid bearer token", async () => {
    const { accessToken } = await startSession(
      fakeDb([{ data: { id: "s1" } }]).db,
      { id: "user-1", name: "Bob", email: "bob@example.test" },
      undefined
    );
    expect(
      await getRequestViewer(request(`Bearer ${accessToken}`))
    ).toMatchObject({
      userId: "user-1",
      name: "Bob",
    });
  });

  it("never falls back to the cookie when a bearer token is bad", async () => {
    session.current = { user: { id: "cookie-user", name: "Carol" } };
    expect(await getRequestViewer(request("Bearer forged"))).toBeNull();
    expect(await getRequestViewer(request("Basic abc"))).toBeNull();
  });

  it("uses the session cookie when there's no Authorization header", async () => {
    session.current = { user: { id: "cookie-user", name: "Carol" } };
    expect(await getRequestViewer(request())).toMatchObject({
      userId: "cookie-user",
    });
    session.current = null;
    expect(await getRequestViewer(request())).toBeNull();
  });
});
