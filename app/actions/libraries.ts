"use server";

import { revalidatePath } from "next/cache";
import { authenticatedAction } from "@/lib/safe-action";
import { consumeRateLimit, type RateLimitRule } from "@/lib/rate-limit";
import {
  MAX_LIBRARIES,
  isLibraryKey,
  lookupLibrary,
  searchLibraryDirectory,
  type Library,
  type LibrarySearchResult,
} from "@/lib/libraries/overdrive";

// Each search proxies a request to Libby's directory; keep that polite.
const SEARCH_LIMIT: RateLimitRule = {
  scope: "library-search:user",
  limit: 30,
  windowSeconds: 60,
};

/** The signed-in user's libraries, in their chosen order. */
export async function getMyLibraries(): Promise<Library[]> {
  const result = await authenticatedAction(async ({ session, supabase }) => {
    const { data, error } = await supabase
      .from("user_libraries")
      .select("library_key, name")
      .eq("user_id", session.user.id)
      .order("position");
    if (error) throw error;
    return (data ?? []).map((row) => ({
      key: row.library_key,
      name: row.name,
    }));
  });
  // Availability is a nice-to-have; never fail a page over it.
  return result.success ? result.data : [];
}

export async function searchLibraries(
  query: string
): Promise<{ results: LibrarySearchResult[] } | { error: string }> {
  const trimmed = typeof query === "string" ? query.trim() : "";
  if (trimmed.length < 2 || trimmed.length > 100) return { results: [] };

  const result = await authenticatedAction(async ({ session, supabase }) => {
    const allowed = await consumeRateLimit(
      supabase,
      SEARCH_LIMIT,
      session.user.id
    );
    if (!allowed) return null;
    return searchLibraryDirectory(trimmed);
  });
  if (!result.success) {
    return { error: "Library search is unavailable right now." };
  }
  if (result.data === null) {
    return { error: "Too many searches. Try again in a minute." };
  }
  return { results: result.data.slice(0, 10) };
}

/**
 * Replaces the user's libraries. Newly added keys are checked against
 * OverDrive and stored with the name it reports, never a client-supplied name.
 * Libraries already saved keep their stored name, so removing one still works
 * when OverDrive is unreachable.
 */
export async function saveMyLibraries(
  keys: string[]
): Promise<{ success: true } | { error: string }> {
  if (!Array.isArray(keys) || !keys.every(isLibraryKey)) {
    return { error: "Please choose libraries from the search results." };
  }
  const unique = [...new Set(keys)];
  if (unique.length > MAX_LIBRARIES) {
    return { error: `You can add up to ${MAX_LIBRARIES} libraries.` };
  }

  const result = await authenticatedAction(async ({ session, supabase }) => {
    const { data: saved, error: readError } = await supabase
      .from("user_libraries")
      .select("library_key, name")
      .eq("user_id", session.user.id);
    if (readError) throw readError;
    const savedNames = new Map(
      (saved ?? []).map((row) => [
        row.library_key as string,
        row.name as string,
      ])
    );

    const libraries = await Promise.all(
      unique.map(async (key): Promise<Library | null> => {
        const name = savedNames.get(key);
        return name ? { key, name } : lookupLibrary(key);
      })
    );
    if (libraries.some((library) => library === null)) return false;

    const { error } = await supabase.rpc("set_user_libraries", {
      p_user_id: session.user.id,
      p_libraries: libraries,
    });
    if (error) throw error;
    return true;
  });

  if (!result.success) {
    return { error: "Couldn't save your libraries. Please try again." };
  }
  if (!result.data) {
    return { error: "One of those libraries isn't available on Libby." };
  }
  revalidatePath("/settings");
  return { success: true };
}
