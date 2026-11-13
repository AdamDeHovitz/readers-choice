import { useSyncExternalStore } from "react";
import { API_URL } from "@/api/config";
import { createSessionManager } from "./session";
import { sessionStorage } from "./storage";

/** The app's one session. Screens use `useSession()`; data code uses `sessions.call`. */
export const sessions = createSessionManager({
  baseUrl: API_URL,
  storage: sessionStorage,
});

/** The current session state; re-renders when it changes. */
export function useSession() {
  return useSyncExternalStore(sessions.subscribe, sessions.getState);
}
