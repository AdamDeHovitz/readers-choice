"use server";

import { revalidatePath } from "next/cache";
import { consumeRateLimit, type RateLimitRule } from "@/server/rate-limit";
import {
  MAX_LIBRARIES,
  isLibraryKey,
  searchLibraryDirectory,
  type LibrarySearchResult,
} from "@/lib/libraries/overdrive";
import { UserError } from "@/lib/user-error";
import { runAction, type ActionResult } from "@/server/action";
import { resolveLibraries, setMyLibraries } from "@/server/libraries";

// Each search proxies a request to Libby's directory; keep that polite.
const SEARCH_LIMIT: RateLimitRule = {
  scope: "library-search:user",
  limit: 30,
  windowSeconds: 60,
};

export async function searchLibraries(
  query: string
): Promise<ActionResult<LibrarySearchResult[]>> {
  return runAction(
    "Library search is unavailable right now.",
    async (viewer) => {
      const trimmed = typeof query === "string" ? query.trim() : "";
      if (trimmed.length < 2 || trimmed.length > 100) return [];

      if (!(await consumeRateLimit(viewer.db, SEARCH_LIMIT, viewer.userId))) {
        throw new UserError("Too many searches. Try again in a minute.");
      }
      return (await searchLibraryDirectory(trimmed)).slice(0, 10);
    }
  );
}

/** Replace the viewer's libraries with these Libby library keys, in order. */
export async function saveMyLibraries(keys: string[]): Promise<ActionResult> {
  return runAction(
    "Couldn't save your libraries. Please try again.",
    async (viewer) => {
      if (!Array.isArray(keys) || !keys.every(isLibraryKey)) {
        throw new UserError("Please choose libraries from the search results.");
      }
      const unique = [...new Set(keys)];
      if (unique.length > MAX_LIBRARIES) {
        throw new UserError(`You can add up to ${MAX_LIBRARIES} libraries.`);
      }

      const libraries = await resolveLibraries(viewer, unique);
      if (!libraries) {
        throw new UserError("One of those libraries isn't available on Libby.");
      }
      await setMyLibraries(viewer, libraries);

      revalidatePath("/settings");
    }
  );
}
