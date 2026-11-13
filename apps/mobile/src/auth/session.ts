import { authPaths, type Session } from "@readers-choice/contract/auth";
import { createOperationClient } from "@readers-choice/contract/client";
import type {
  InputOf,
  OperationContract,
  OutputOf,
} from "@readers-choice/contract/operation";
import type {
  ActionResult,
  OperationResponse,
} from "@readers-choice/contract/result";

/**
 * The app's sign-in session (see "Mobile sign-in" in docs/architecture.md).
 *
 * Plain TypeScript, no React Native, so it's unit-tested directly:
 * - The refresh token and user persist in `storage` (the iOS keychain);
 *   the 15-minute access token lives only in memory.
 * - `call` sends an operation with the access token, refreshing first when
 *   it's about to expire, and once more if the server says `unauthenticated`.
 * - Refreshes are single-flight: the server replaces the refresh token on
 *   every refresh and revokes the session if an old one is replayed, so
 *   concurrent callers must share one refresh.
 * - A dead refresh token signs the device out; a network failure doesn't.
 */

export type SessionUser = Session["user"];

export type SessionState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; user: SessionUser };

/** What survives an app restart. Never includes the access token. */
export interface StoredSession {
  refreshToken: string;
  user: SessionUser;
}

export interface SessionStorage {
  load(): Promise<StoredSession | null>;
  save(session: StoredSession): Promise<void>;
  clear(): Promise<void>;
}

export interface SessionManagerOptions {
  baseUrl: string;
  storage: SessionStorage;
  fetch?: typeof fetch;
  now?: () => number;
}

/** Refresh when the access token has less than this left. */
const EXPIRY_MARGIN_MS = 30_000;
const UNREACHABLE = "Couldn't reach Readers' Choice. Check your connection.";

export function createSessionManager({
  baseUrl,
  storage,
  fetch: fetchImpl = (...args) => fetch(...args),
  now = Date.now,
}: SessionManagerOptions) {
  let state: SessionState = { status: "loading" };
  let refreshToken: string | null = null;
  let access: { token: string; expiresAt: number } | null = null;
  let refreshing: Promise<boolean> | null = null;
  const listeners = new Set<() => void>();

  function setState(next: SessionState) {
    state = next;
    for (const listener of listeners) listener();
  }

  async function post<T>(
    path: string,
    body: unknown
  ): Promise<ActionResult<T>> {
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return (await response.json()) as ActionResult<T>;
    } catch {
      return { success: false, error: UNREACHABLE, code: "unavailable" };
    }
  }

  async function adopt(session: Session) {
    refreshToken = session.refreshToken;
    access = {
      token: session.accessToken,
      expiresAt: Date.parse(session.accessTokenExpiresAt),
    };
    await storage.save({
      refreshToken: session.refreshToken,
      user: session.user,
    });
    setState({ status: "signedIn", user: session.user });
  }

  async function forget() {
    refreshToken = null;
    access = null;
    await storage.clear();
    setState({ status: "signedOut" });
  }

  /** Get a new access token. False if there's no usable session now. */
  function refresh(): Promise<boolean> {
    refreshing ??= (async () => {
      if (!refreshToken) return false;
      const result = await post<Session>(authPaths.refresh, { refreshToken });
      if (result.success) {
        await adopt(result.data);
        return true;
      }
      // Offline or a server hiccup: keep the session and try again later.
      if (result.code !== "refused" && result.code !== "invalid_input") {
        return false;
      }
      await forget();
      return false;
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  // A function, not a read of `access`, because refresh() replaces it.
  const currentToken = () => access?.token ?? null;

  async function accessToken(): Promise<string | null> {
    if (!access || access.expiresAt - now() < EXPIRY_MARGIN_MS) {
      await refresh();
    }
    return currentToken();
  }

  const operations = createOperationClient({ baseUrl, fetch: fetchImpl });

  return {
    getState: () => state,

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** Load the saved session at startup. */
    async restore() {
      const saved = await storage.load();
      if (!saved) return setState({ status: "signedOut" });
      refreshToken = saved.refreshToken;
      setState({ status: "signedIn", user: saved.user });
    },

    async signInWithPassword(input: {
      email: string;
      password: string;
      deviceName?: string;
    }): Promise<ActionResult> {
      const result = await post<Session>(authPaths.password, input);
      if (!result.success) return result;
      await adopt(result.data);
      return { success: true, data: undefined };
    },

    /** Sign this device out. Local state clears even if the server is unreachable. */
    async signOut() {
      const token = refreshToken;
      await forget();
      if (token) await post(authPaths.signOut, { refreshToken: token });
    },

    /** Run an operation as the signed-in user. */
    async call<C extends OperationContract>(
      contract: C,
      input: InputOf<C>
    ): Promise<OperationResponse<OutputOf<C>>> {
      const send = async (token: string | null) =>
        operations.call(contract, input, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      const first = await send(await accessToken());
      if (first.success || first.code !== "unauthenticated" || !refreshToken) {
        return first;
      }
      access = null;
      if (!(await refresh())) return first;
      return send(currentToken());
    },
  };
}

export type SessionManager = ReturnType<typeof createSessionManager>;
