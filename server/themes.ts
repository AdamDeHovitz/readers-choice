import "server-only";
import { findFuzzyMatch } from "@/lib/fuzzy-match";
import { UserError } from "@/lib/user-error";
import type { Db } from "./db";
import type { Viewer } from "./viewer";

const UNIQUE_VIOLATION = "23505";

async function findThemeId(
  db: Db,
  bookClubId: string,
  name: string
): Promise<string | null> {
  const { data, error } = await db
    .from("themes")
    .select("id")
    .eq("book_club_id", bookClubId)
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/**
 * Resolve a theme name to a theme id for a meeting, creating the theme if
 * the club doesn't have one by that exact name. Blank names mean "no theme".
 *
 * Themes are shared club-wide (other meetings and votes reference them), so
 * they're matched by name and never renamed.
 */
export async function findOrCreateTheme(
  db: Db,
  bookClubId: string,
  name: string | null | undefined,
  submittedBy: string
): Promise<string | null> {
  const trimmed = name?.trim();
  if (!trimmed) return null;

  const existing = await findThemeId(db, bookClubId, trimmed);
  if (existing) return existing;

  const { data, error } = await db
    .from("themes")
    .insert({
      book_club_id: bookClubId,
      name: trimmed,
      submitted_by: submittedBy,
    })
    .select("id")
    .single();

  if (error?.code === UNIQUE_VIOLATION) {
    // Created concurrently; use that row.
    const raced = await findThemeId(db, bookClubId, trimmed);
    if (raced) return raced;
  }
  if (error) throw error;
  return data.id;
}

/** Create a suggested theme unless the club has one with a similar name. */
export async function suggestTheme(
  db: Db,
  bookClubId: string,
  name: string,
  submittedBy: string
): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new UserError("Theme name is required");

  const { data: themes, error } = await db
    .from("themes")
    .select("id, name")
    .eq("book_club_id", bookClubId);
  if (error) throw error;

  const similar = findFuzzyMatch(trimmed, themes);
  if (similar) {
    throw new UserError(
      `Theme "${similar.name}" already exists (similar to "${trimmed}")`
    );
  }

  const { data, error: insertError } = await db
    .from("themes")
    .insert({
      book_club_id: bookClubId,
      name: trimmed,
      submitted_by: submittedBy,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return data.id;
}

/** Theme names for autocomplete: unused themes first, then by upvotes. */
export async function getThemeSuggestions(
  db: Db,
  bookClubId: string
): Promise<string[]> {
  const { data, error } = await db
    .from("themes")
    .select("name, theme_votes (id), meetings (id)")
    .eq("book_club_id", bookClubId);
  if (error) throw error;

  return data
    .map((theme) => ({
      name: theme.name,
      voteCount: theme.theme_votes.length,
      isUsed: theme.meetings.length > 0,
    }))
    .sort((a, b) =>
      a.isUsed !== b.isUsed ? (a.isUsed ? 1 : -1) : b.voteCount - a.voteCount
    )
    .map((theme) => theme.name);
}

export interface ClubTheme {
  id: string;
  name: string;
  createdAt: string | null;
  submittedBy: { id: string; name: string; image: string | null } | null;
  upvoteCount: number;
  userHasUpvoted: boolean;
  timesUsed: number;
  meetings: { id: string; meetingDate: string; isFinalized: boolean }[];
}

/** All of a club's themes with upvotes and usage, newest first. */
export async function getBookClubThemes(
  { db, userId }: Viewer,
  bookClubId: string
): Promise<ClubTheme[]> {
  const { data, error } = await db
    .from("themes")
    .select(
      `id, name, created_at,
       users (id, name, avatar_url),
       theme_votes (user_id),
       meetings (id, meeting_date, is_finalized)`
    )
    .eq("book_club_id", bookClubId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return data.map((theme) => ({
    id: theme.id,
    name: theme.name,
    createdAt: theme.created_at,
    submittedBy: theme.users
      ? {
          id: theme.users.id,
          name: theme.users.name,
          image: theme.users.avatar_url,
        }
      : null,
    upvoteCount: theme.theme_votes.length,
    userHasUpvoted: theme.theme_votes.some((vote) => vote.user_id === userId),
    timesUsed: theme.meetings.length,
    meetings: theme.meetings.map((meeting) => ({
      id: meeting.id,
      meetingDate: meeting.meeting_date,
      isFinalized: meeting.is_finalized === true,
    })),
  }));
}
