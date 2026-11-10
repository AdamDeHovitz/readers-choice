import "server-only";
import { cache } from "react";
import { auth } from "@/auth";
import { createAdminClient, type Db } from "./db";

/** The signed-in user making this request, plus a database client. */
export interface Viewer {
  userId: string;
  /** Display name, for navigation chrome. */
  name: string;
  db: Db;
}

/**
 * Resolve the signed-in user for this request, or null when signed out.
 * Cached per request so pages and the queries they call share one lookup.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return {
    userId,
    name: session.user?.name || "User",
    db: createAdminClient(),
  };
});
