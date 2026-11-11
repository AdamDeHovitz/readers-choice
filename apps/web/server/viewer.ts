import "server-only";
import { cache } from "react";
import { auth } from "@/auth";
import { createAdminClient, type Db } from "./db";
import { verifyAccessToken } from "./mobile-sessions";

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

/**
 * The viewer for an /api/v1 request: the mobile app's bearer access token,
 * or else the web session cookie. A request that sends a bearer token is
 * judged by that token alone, so a bad token never falls back to a cookie.
 */
export async function getRequestViewer(
  request: Request
): Promise<Viewer | null> {
  const authorization = request.headers.get("authorization");
  if (authorization === null) return getViewer();

  const token = /^Bearer\s+(\S+)$/i.exec(authorization)?.[1];
  const claims = token ? await verifyAccessToken(token) : null;
  if (!claims) return null;
  return { userId: claims.userId, name: claims.name, db: createAdminClient() };
}
