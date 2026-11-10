import "server-only";
import type { Viewer } from "./viewer";
import { createAdminClient } from "./db";

export interface MyBookClub {
  id: string;
  name: string;
  description: string | null;
  createdAt: string | null;
  isAdmin: boolean;
  joinedAt: string | null;
}

/** Clubs the viewer belongs to, most recently joined first. */
export async function getMyBookClubs({
  db,
  userId,
}: Viewer): Promise<MyBookClub[]> {
  const { data, error } = await db
    .from("members")
    .select(
      "is_admin, joined_at, book_clubs!inner (id, name, description, created_at)"
    )
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });
  if (error) throw error;

  return data.map(({ book_clubs: club, is_admin, joined_at }) => ({
    id: club.id,
    name: club.name,
    description: club.description,
    createdAt: club.created_at,
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
 * prompt), so member emails are only included for members.
 */
export async function getBookClubDetails(
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
}

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
