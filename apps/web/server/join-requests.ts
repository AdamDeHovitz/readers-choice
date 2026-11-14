import "server-only";
import type { JoinPolicy } from "@readers-choice/core/join-policy";
import { canRequestAgainAt } from "@readers-choice/core/join-policy";
import { UserError } from "@readers-choice/core/user-error";
import type { Db } from "./db";
import { throwIfDbError } from "./errors";

/** Change who can join. Opening the club admits everyone waiting, atomically. */
export async function setJoinPolicy(
  db: Db,
  bookClubId: string,
  policy: JoinPolicy
): Promise<void> {
  const { error } = await db.rpc("set_club_join_policy", {
    p_book_club_id: bookClubId,
    p_policy: policy,
  });
  throwIfDbError(error);
}

/**
 * Join an open club or ask to join one that takes requests. The database
 * re-checks the policy, membership and decline cooldown atomically.
 */
export async function joinOrRequest(
  db: Db,
  bookClubId: string,
  userId: string,
  message: string | null
): Promise<"joined" | "requested"> {
  const { data, error } = await db.rpc("join_or_request_club", {
    p_book_club_id: bookClubId,
    p_user_id: userId,
    ...(message && { p_message: message }),
  });
  throwIfDbError(error);
  if (data !== "joined" && data !== "requested") {
    throw new Error(`join_or_request_club returned ${String(data)}`);
  }
  return data;
}

/** Withdraw a pending request. A declined one stays, so the cooldown holds. */
export async function cancelJoinRequest(
  db: Db,
  bookClubId: string,
  userId: string
): Promise<void> {
  const { error } = await db
    .from("join_requests")
    .delete()
    .eq("book_club_id", bookClubId)
    .eq("user_id", userId)
    .eq("status", "pending");
  if (error) throw error;
}

/** Make the requester a member, atomically. */
export async function approveJoinRequest(
  db: Db,
  bookClubId: string,
  userId: string
): Promise<void> {
  const { data, error } = await db.rpc("approve_join_request", {
    p_book_club_id: bookClubId,
    p_user_id: userId,
  });
  throwIfDbError(error);
  if (!data) throw new UserError("That request is no longer pending");
}

export async function declineJoinRequest(
  db: Db,
  bookClubId: string,
  userId: string,
  decidedBy: string
): Promise<void> {
  const { data, error } = await db
    .from("join_requests")
    .update({
      status: "declined",
      decided_at: new Date().toISOString(),
      decided_by: decidedBy,
    })
    .eq("book_club_id", bookClubId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("id");
  if (error) throw error;
  if (data.length === 0) {
    throw new UserError("That request is no longer pending");
  }
}

/** Drop the user's request, e.g. once an invite link has admitted them. */
export async function clearJoinRequest(
  db: Db,
  bookClubId: string,
  userId: string
): Promise<void> {
  const { error } = await db
    .from("join_requests")
    .delete()
    .eq("book_club_id", bookClubId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Where the viewer stands with a club they haven't joined. */
export type ViewerJoinRequest =
  | { status: "none" }
  | { status: "pending"; message: string | null }
  /** Declined; they may ask again from `canRequestAgainAt`. */
  | { status: "cooldown"; canRequestAgainAt: string };

export async function getViewerJoinRequest(
  db: Db,
  bookClubId: string,
  userId: string,
  now = new Date()
): Promise<ViewerJoinRequest> {
  const { data, error } = await db
    .from("join_requests")
    .select("status, message, decided_at")
    .eq("book_club_id", bookClubId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { status: "none" };
  if (data.status === "pending") {
    return { status: "pending", message: data.message };
  }
  const againAt = canRequestAgainAt(new Date(data.decided_at ?? 0));
  return againAt > now
    ? { status: "cooldown", canRequestAgainAt: againAt.toISOString() }
    : { status: "none" };
}

export interface PendingJoinRequest {
  userId: string;
  name: string;
  avatarUrl: string | null;
  message: string | null;
  requestedAt: string;
}

/** A club's pending requests, oldest first. Callers check the viewer is an admin. */
export async function getPendingJoinRequests(
  db: Db,
  bookClubId: string
): Promise<PendingJoinRequest[]> {
  const { data, error } = await db
    .from("join_requests")
    .select(
      "message, created_at, users!join_requests_user_id_fkey (id, name, avatar_url)"
    )
    .eq("book_club_id", bookClubId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(({ users: user, message, created_at }) => ({
    userId: user.id,
    name: user.name,
    avatarUrl: user.avatar_url,
    message,
    requestedAt: created_at,
  }));
}

/** How many requests are waiting, for the admin's Members tab badge. */
export async function countPendingJoinRequests(
  db: Db,
  bookClubId: string
): Promise<number> {
  const { count, error } = await db
    .from("join_requests")
    .select("id", { count: "exact", head: true })
    .eq("book_club_id", bookClubId)
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}
