/**
 * Cache keys: queries are cached under them (`cacheKey` on a contract), and
 * writes return the ones they make stale. They're arrays so they work as
 * TanStack Query keys and prefixes on mobile; the web maps each one to the
 * pages to revalidate (apps/web/app/_operations/revalidate.ts).
 *
 * Installed apps match these against what the server sends, so their shapes
 * are part of the API: the contract snapshot records them.
 */
export const keys = {
  /** The signed-in member's clubs. */
  myClubs: () => ["me", "clubs"] as const,
  /** The clubs anyone can find and join or ask to join. */
  clubDirectory: () => ["clubs"] as const,
  /** Everything about one club: its details, members, requests, meetings. */
  club: (clubId: string) => ["club", clubId] as const,
  /** A club's themes. */
  clubThemes: (clubId: string) => ["club", clubId, "themes"] as const,
};

export type InvalidationKey = ReturnType<(typeof keys)[keyof typeof keys]>;
