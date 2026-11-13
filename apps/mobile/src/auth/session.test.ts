import { describe, expect, it, vi } from "vitest";
import { listThemes } from "@readers-choice/contract/themes";
import {
  createSessionManager,
  type SessionStorage,
  type StoredSession,
} from "./session";

const BASE = "https://site.example";
const CLUB = "22222222-0000-4000-8000-000000000001";
const NOW = Date.parse("2026-11-11T12:00:00Z");
const user = { id: "user-1", name: "Bob", email: "bob@example.test" };

const session = (n: number) => ({
  accessToken: `access-${n}`,
  accessTokenExpiresAt: new Date(NOW + 15 * 60_000).toISOString(),
  refreshToken: `refresh-${n}`,
  user,
});

function memoryStorage(initial: StoredSession | null = null) {
  let saved = initial;
  const storage: SessionStorage = {
    load: async () => saved,
    save: async (s) => {
      saved = s;
    },
    clear: async () => {
      saved = null;
    },
  };
  return { storage, saved: () => saved };
}

/** A fake server: each route answers from a queue of responses. */
function fakeServer(routes: Record<string, unknown[]>) {
  const calls: { path: string; body: unknown; auth: string | null }[] = [];
  const fetch = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      const path = String(url).replace(BASE, "");
      const headers = new Headers(init?.headers);
      calls.push({
        path,
        body: JSON.parse(String(init?.body)),
        auth: headers.get("authorization"),
      });
      const queue = routes[path];
      if (!queue?.length) throw new TypeError(`no fake response for ${path}`);
      const next = queue.shift();
      if (next instanceof Error) throw next;
      return Response.json(next);
    }
  );
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}

const ok = <T>(data: T) => ({ success: true, data });
const themes = { success: true, data: { themes: [] }, invalidate: [] };
const unauthenticated = {
  success: false,
  error: "Unauthorized",
  code: "unauthenticated",
  invalidate: [],
};
const dead = {
  success: false,
  error: "Your session has ended. Please sign in again.",
  code: "refused",
};

function manager(
  routes: Record<string, unknown[]>,
  saved: StoredSession | null = null
) {
  const server = fakeServer(routes);
  const store = memoryStorage(saved);
  const sessions = createSessionManager({
    baseUrl: BASE,
    storage: store.storage,
    fetch: server.fetch,
    now: () => NOW,
  });
  return { sessions, ...server, ...store };
}

describe("createSessionManager", () => {
  it("signs in, saves only the refresh token and user, and sends the access token", async () => {
    const { sessions, calls, saved } = manager({
      "/api/v1/auth/password": [ok(session(1))],
      "/api/v1/themes.list": [themes],
    });
    expect(
      await sessions.signInWithPassword({
        email: "bob@example.test",
        password: "pw",
      })
    ).toEqual({ success: true, data: undefined });
    expect(sessions.getState()).toEqual({ status: "signedIn", user });
    expect(saved()).toEqual({ refreshToken: "refresh-1", user });

    expect(await sessions.call(listThemes, { bookClubId: CLUB })).toEqual(
      themes
    );
    expect(calls[1]).toMatchObject({
      path: "/api/v1/themes.list",
      auth: "Bearer access-1",
    });
  });

  it("returns a failed sign-in as-is and stays signed out", async () => {
    const wrong = {
      success: false,
      error: "Incorrect email or password",
      code: "refused",
    };
    const { sessions, saved } = manager({ "/api/v1/auth/password": [wrong] });
    await sessions.restore();
    expect(
      await sessions.signInWithPassword({ email: "x", password: "y" })
    ).toEqual(wrong);
    expect(sessions.getState()).toEqual({ status: "signedOut" });
    expect(saved()).toBeNull();
  });

  it("restores a saved session and refreshes before the first call", async () => {
    const { sessions, calls, saved } = manager(
      {
        "/api/v1/auth/refresh": [ok(session(2))],
        "/api/v1/themes.list": [themes],
      },
      { refreshToken: "refresh-1", user }
    );
    await sessions.restore();
    expect(sessions.getState()).toEqual({ status: "signedIn", user });
    await sessions.call(listThemes, { bookClubId: CLUB });
    expect(calls.map((c) => c.path)).toEqual([
      "/api/v1/auth/refresh",
      "/api/v1/themes.list",
    ]);
    expect(calls[0].body).toEqual({ refreshToken: "refresh-1" });
    expect(calls[1].auth).toBe("Bearer access-2");
    expect(saved()?.refreshToken).toBe("refresh-2");
  });

  it("refreshes once and retries when the server says unauthenticated", async () => {
    const { sessions, calls } = manager({
      "/api/v1/auth/password": [ok(session(1))],
      "/api/v1/themes.list": [unauthenticated, themes],
      "/api/v1/auth/refresh": [ok(session(2))],
    });
    await sessions.signInWithPassword({ email: "e", password: "p" });
    expect(await sessions.call(listThemes, { bookClubId: CLUB })).toEqual(
      themes
    );
    expect(calls.map((c) => [c.path, c.auth])).toEqual([
      ["/api/v1/auth/password", null],
      ["/api/v1/themes.list", "Bearer access-1"],
      ["/api/v1/auth/refresh", null],
      ["/api/v1/themes.list", "Bearer access-2"],
    ]);
  });

  it("shares one refresh between concurrent calls", async () => {
    const { sessions, calls } = manager(
      {
        "/api/v1/auth/refresh": [ok(session(2))],
        "/api/v1/themes.list": [themes, themes, themes],
      },
      { refreshToken: "refresh-1", user }
    );
    await sessions.restore();
    await Promise.all([
      sessions.call(listThemes, { bookClubId: CLUB }),
      sessions.call(listThemes, { bookClubId: CLUB }),
      sessions.call(listThemes, { bookClubId: CLUB }),
    ]);
    expect(calls.filter((c) => c.path === "/api/v1/auth/refresh")).toHaveLength(
      1
    );
    expect(
      calls.filter((c) => c.path === "/api/v1/themes.list").map((c) => c.auth)
    ).toEqual(["Bearer access-2", "Bearer access-2", "Bearer access-2"]);
  });

  it("signs the device out when the refresh token is dead", async () => {
    const { sessions, saved } = manager(
      {
        "/api/v1/auth/refresh": [dead],
        "/api/v1/themes.list": [unauthenticated],
      },
      { refreshToken: "refresh-1", user }
    );
    await sessions.restore();
    const result = await sessions.call(listThemes, { bookClubId: CLUB });
    expect(result).toMatchObject({ success: false, code: "unauthenticated" });
    expect(sessions.getState()).toEqual({ status: "signedOut" });
    expect(saved()).toBeNull();
  });

  it("stays signed in when it can't reach the server", async () => {
    const offline = new TypeError("Network request failed");
    const { sessions, saved } = manager(
      {
        "/api/v1/auth/refresh": [offline],
        "/api/v1/themes.list": [offline],
      },
      { refreshToken: "refresh-1", user }
    );
    await sessions.restore();
    const result = await sessions.call(listThemes, { bookClubId: CLUB });
    expect(result).toMatchObject({ success: false, code: "unavailable" });
    expect(sessions.getState()).toEqual({ status: "signedIn", user });
    expect(saved()).toEqual({ refreshToken: "refresh-1", user });
  });

  it("signs out locally first, then tells the server, even when offline", async () => {
    const { sessions, calls, saved } = manager({
      "/api/v1/auth/password": [ok(session(1))],
      "/api/v1/auth/sign-out": [new TypeError("Network request failed")],
    });
    await sessions.signInWithPassword({ email: "e", password: "p" });
    const states: string[] = [];
    sessions.subscribe(() => states.push(sessions.getState().status));
    await sessions.signOut();
    expect(states).toEqual(["signedOut"]);
    expect(saved()).toBeNull();
    expect(calls.at(-1)).toMatchObject({
      path: "/api/v1/auth/sign-out",
      body: { refreshToken: "refresh-1" },
    });
  });
});
