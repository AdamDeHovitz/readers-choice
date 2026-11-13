import { focusManager, QueryClient } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";
import { sessions } from "@/auth";
import { OperationError } from "./operation-error";

/** The app's query cache. Screens use the hooks in ./queries. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A refusal (not a member, bad input) won't change by retrying.
      retry: (failures, error) =>
        failures < 2 && !(error instanceof OperationError && !error.transient),
      staleTime: 30_000,
    },
  },
});

// One member's data must never show for the next: drop the cache on sign-out.
sessions.subscribe(() => {
  if (sessions.getState().status === "signedOut") queryClient.clear();
});

// Refetch stale data when the app comes back to the foreground (TanStack
// Query only watches window focus, which doesn't exist on a phone).
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (status) => {
    focusManager.setFocused(status === "active");
  });
}
