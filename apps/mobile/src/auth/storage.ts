import * as SecureStore from "expo-secure-store";
import type { SessionStorage, StoredSession } from "./session";

/**
 * The saved session in the iOS keychain / Android keystore. Readable only by
 * this app, and only once the device has been unlocked after a restart.
 * (storage.web.ts is the browser build's stand-in.)
 */
const KEY = "readers-choice.session";
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export const sessionStorage: SessionStorage = {
  async load() {
    const raw = await SecureStore.getItemAsync(KEY, OPTIONS);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  },
  save: (session) =>
    SecureStore.setItemAsync(KEY, JSON.stringify(session), OPTIONS),
  clear: () => SecureStore.deleteItemAsync(KEY, OPTIONS),
};
