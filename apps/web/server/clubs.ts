import "server-only";
import { cache } from "react";
import type { MyClub } from "@readers-choice/contract/clubs";
import { UserError } from "@readers-choice/core/user-error";
import { createAdminClient, type Db } from "./db";
import { throwIfDbError } from "./errors";
import type { Viewer } from "./viewer";

/** Clubs the viewer belongs to, most recently joined first. */
export async function getMyBookClubs({
  db,
  userId,
}: Viewer): Promise<MyClub[]> {
  const { data, error } = await db
    .from("members")
    .select("is_admin, joined_at, book_clubs!inner (id, name, description)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });
  if (error) throw error;

  return data.map(({ book_clubs: club, is_admin, joined_at }) => ({
    id: club.id,
    name: club.name,
    description: club.description,
    isAdmin: is_admin === true,
    joinedAt: joined_at,
  }));
}

export interface ClubMember {
  id: string;
  name: string;
  /** Only shown to fellow members; clubs are publicly browsable. */
  email: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  joinedAt: string | null;
}

export interface BookClubDetails {
  id: string;
  name: string;
  description: string | null;
  members: ClubMember[];
  currentUserIsAdmin: boolean;
  currentUserIsMember: boolean;
}

/**
 * A club and its members. Public (the club page shows non-members an invite
 * prompt), so member emails are only included for members. Cached per
 * request, so the club layout and its pages share one lookup.
 */
export const getBookClubDetails = cache(async function getBookClubDetails(
  viewer: Viewer | null,
  bookClubId: string
): Promise<BookClubDetails | null> {
  const db = viewer?.db ?? createAdminClient();

  const [clubResult, membersResult] = await Promise.all([
    db
      .from("book_clubs")
      .select("id, name, description")
      .eq("id", bookClubId)
      .maybeSingle(),
    db
      .from("members")
      .select(
        "user_id, is_admin, joined_at, users!inner (id, name, email, avatar_url)"
      )
      .eq("book_club_id", bookClubId)
      .order("joined_at", { ascending: true }),
  ]);
  if (clubResult.error) throw clubResult.error;
  if (membersResult.error) throw membersResult.error;

  const club = clubResult.data;
  if (!club) return null;

  const members = membersResult.data;
  const self = viewer
    ? members.find((m) => m.user_id === viewer.userId)
    : undefined;

  return {
    id: club.id,
    name: club.name,
    description: club.description,
    members: members.map(({ users: user, is_admin, joined_at }) => ({
      id: user.id,
      name: user.name,
      email: self ? user.email : null,
      avatarUrl: user.avatar_url,
      isAdmin: is_admin === true,
      joinedAt: joined_at,
    })),
    currentUserIsAdmin: self?.is_admin === true,
    currentUserIsMember: !!self,
  };
});

export interface BrowsableBookClub {
  id: string;
  name: string;
  description: string | null;
  createdAt: string | null;
  memberCount: number;
  isMember: boolean;
}

/** Every club, newest first, flagged with whether the viewer belongs to it. */
export async function getAllBookClubs(
  viewer: Viewer | null
): Promise<BrowsableBookClub[]> {
  const db = viewer?.db ?? createAdminClient();

  const [clubsResult, membershipsResult] = await Promise.all([
    db
      .from("book_clubs")
      .select("id, name, description, created_at, members(count)")
      .order("created_at", { ascending: false }),
    viewer
      ? db.from("members").select("book_club_id").eq("user_id", viewer.userId)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (clubsResult.error) throw clubsResult.error;
  if (membershipsResult.error) throw membershipsResult.error;

  const memberOf = new Set(
    (membershipsResult.data ?? []).map((m) => m.book_club_id)
  );

  return clubsResult.data.map((club) => ({
    id: club.id,
    name: club.name,
    description: club.description,
    createdAt: club.created_at,
    memberCount: club.members[0]?.count ?? 0,
    isMember: memberOf.has(club.id),
  }));
}

/** Create a club with its creator as the first admin, atomically; returns its id. */
export async function createBookClub(
  db: Db,
  club: { name: string; description: string | null },
  creatorId: string
): Promise<string> {
  const { data, error } = await db.rpc("create_book_club", {
    p_name: club.name,
    p_creator_id: creatorId,
    ...(club.description && { p_description: club.description }),
  });
  if (error) throw error;
  return data;
}

export async function addMember(
  db: Db,
  bookClubId: string,
  userId: string,
  { isAdmin = false } = {}
): Promise<void> {
  const { error } = await db
    .from("members")
    .insert({ book_club_id: bookClubId, user_id: userId, is_admin: isAdmin });
  if (error) throw error;
}

/** Atomic; the database refuses to demote the club's last admin. */
export async function setMemberAdmin(
  db: Db,
  bookClubId: string,
  userId: string,
  isAdmin: boolean
): Promise<void> {
  const { error } = await db.rpc("set_member_admin", {
    p_book_club_id: bookClubId,
    p_user_id: userId,
    p_is_admin: isAdmin,
  });
  throwIfDbError(error);
}

/** Atomic; the database refuses to remove the club's last admin. */
export async function removeMember(
  db: Db,
  bookClubId: string,
  userId: string
): Promise<void> {
  const { error } = await db.rpc("remove_club_member", {
    p_book_club_id: bookClubId,
    p_user_id: userId,
  });
  throwIfDbError(error);
}

/** SQLSTATE of a plain RAISE EXCEPTION in a database function. */
const RAISED_EXCEPTION = "P0001";

/**
 * Delete a club and everything in it. The database function re-checks that
 * the actor is a super admin and that `confirmationName` matches exactly.
 */
export async function deleteBookClub(
  db: Db,
  bookClubId: string,
  actorId: string,
  confirmationName: string
): Promise<void> {
  const { error } = await db.rpc("delete_book_club", {
    p_book_club_id: bookClubId,
    p_actor_id: actorId,
    p_confirmation_name: confirmationName,
  });
  // Its RAISE EXCEPTIONs (wrong name, not found) are written for users.
  if (error?.code === RAISED_EXCEPTION) throw new UserError(error.message);
  if (error) throw error;
}
