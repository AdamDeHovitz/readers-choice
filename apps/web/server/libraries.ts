import "server-only";
import { lookupLibrary, type Library } from "@readers-choice/core/libraries/overdrive";
import type { Viewer } from "./viewer";

/** The viewer's libraries, in their chosen order. */
export async function getMyLibraries({
  db,
  userId,
}: Viewer): Promise<Library[]> {
  const { data, error } = await db
    .from("user_libraries")
    .select("library_key, name")
    .eq("user_id", userId)
    .order("position");
  if (error) throw error;
  return data.map((row) => ({ key: row.library_key, name: row.name }));
}

/**
 * Resolve library keys to libraries for saving. Keys the user already saved
 * keep their stored name (so removing one works while OverDrive is down);
 * new keys are checked against OverDrive and use the name it reports, never a
 * client-supplied one. Returns null if any key isn't a Libby library.
 */
export async function resolveLibraries(
  viewer: Viewer,
  keys: readonly string[]
): Promise<Library[] | null> {
  const saved = new Map(
    (await getMyLibraries(viewer)).map((library) => [library.key, library])
  );
  const libraries = await Promise.all(
    keys.map((key) => saved.get(key) ?? lookupLibrary(key))
  );
  return libraries.every((library) => library !== null) ? libraries : null;
}

export async function setMyLibraries(
  { db, userId }: Viewer,
  libraries: Library[]
): Promise<void> {
  const { error } = await db.rpc("set_user_libraries", {
    p_user_id: userId,
    p_libraries: libraries.map(({ key, name }) => ({ key, name })),
  });
  if (error) throw error;
}
