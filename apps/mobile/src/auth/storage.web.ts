import type { SessionStorage, StoredSession } from "./session";

/**
 * The browser build has no keychain, so the session lives in localStorage.
 * The web build is for development; members use the website, not this.
 */
const KEY = "readers-choice.session";

export const sessionStorage: SessionStorage = {
  async load() {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  },
  async save(session) {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(session));
  },
  async clear() {
    globalThis.localStorage?.removeItem(KEY);
  },
};
