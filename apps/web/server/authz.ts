import "server-only";
import type { Db } from "./db";
import type { Viewer } from "./viewer";
import { UserError } from "@readers-choice/core/user-error";

export interface Membership {
  isAdmin: boolean;
}

/** The user's membership in a club, or null if they aren't a member. */
export async function getMembership(
  db: Db,
  bookClubId: string,
  userId: string
): Promise<Membership | null> {
  const { data, error } = await db
    .from("members")
    .select("is_admin")
    .eq("book_club_id", bookClubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? { isAdmin: data.is_admin === true } : null;
}

export async function isMember(
  db: Db,
  bookClubId: string,
  userId: string
): Promise<boolean> {
  return (await getMembership(db, bookClubId, userId)) !== null;
}

/** Throws a UserError with `message` unless the user is a club member. */
export async function requireMember(
  db: Db,
  bookClubId: string,
  userId: string,
  message = "You must be a member of this book club"
): Promise<Membership> {
  const membership = await getMembership(db, bookClubId, userId);
  if (!membership) throw new UserError(message);
  return membership;
}

/** Throws a UserError with `message` unless the user is a club admin. */
export async function requireAdmin(
  db: Db,
  bookClubId: string,
  userId: string,
  message = "Only admins can do this"
): Promise<void> {
  const membership = await getMembership(db, bookClubId, userId);
  if (!membership?.isAdmin) throw new UserError(message);
}

/** Reads the current database role rather than trusting a stale session. */
export async function isSuperAdmin(db: Db, userId: string): Promise<boolean> {
  const { data, error } = await db
    .from("users")
    .select("is_super_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data?.is_super_admin === true;
}

/** Whether to show super-admin controls; false if signed out or unknown. */
export async function viewerIsSuperAdmin(
  viewer: Viewer | null
): Promise<boolean> {
  if (!viewer) return false;
  try {
    return await isSuperAdmin(viewer.db, viewer.userId);
  } catch (error) {
    console.error("Super admin lookup failed:", error);
    return false;
  }
}
