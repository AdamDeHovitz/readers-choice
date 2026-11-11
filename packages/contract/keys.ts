/**
 * Cache keys for data an operation's writes make stale. They're arrays so
 * they double as TanStack Query key prefixes on mobile; the web maps each one
 * to the paths to revalidate (app/actions/server-action.ts).
 */
export const keys = {
  clubThemes: (clubId: string) => ["club", clubId, "themes"] as const,
};

export type InvalidationKey = ReturnType<(typeof keys)[keyof typeof keys]>;
