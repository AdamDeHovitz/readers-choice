import "server-only";
import { randomBytes } from "crypto";
import { feedHistoryStart, type CalendarMeeting } from "@/lib/club-calendar";
import { isMember } from "./authz";
import type { Db } from "./db";

/**
 * Per-member calendar feed tokens. Calendar apps fetch feeds without a
 * session, so the token in the URL is the credential. Callers authorize the
 * member before issuing or resetting one; the feed re-checks membership on
 * every fetch, so a removed member's token stops working.
 */

/** 256 bits, encoded as 43 base64url characters (the column's CHECK). */
const TOKEN_BYTES = 32;

function generateFeedToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function isWellFormedFeedToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

const UNIQUE_VIOLATION = "23505";

async function findToken(
  db: Db,
  bookClubId: string,
  userId: string
): Promise<string | null> {
  const { data, error } = await db
    .from("calendar_feed_tokens")
    .select("token")
    .eq("book_club_id", bookClubId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.token ?? null;
}

/** The member's feed token for the club, creating one if needed. */
export async function getOrCreateFeedToken(
  db: Db,
  bookClubId: string,
  userId: string
): Promise<string> {
  const existing = await findToken(db, bookClubId, userId);
  if (existing) return existing;

  const token = generateFeedToken();
  const { error } = await db
    .from("calendar_feed_tokens")
    .insert({ token, book_club_id: bookClubId, user_id: userId });
  if (!error) return token;
  // A concurrent request (e.g. a double-opened dialog) created it first.
  if (error.code === UNIQUE_VIOLATION) {
    const raced = await findToken(db, bookClubId, userId);
    if (raced) return raced;
  }
  throw error;
}

/** Replace the member's feed token, breaking any existing subscription. */
export async function resetFeedToken(
  db: Db,
  bookClubId: string,
  userId: string
): Promise<string> {
  const token = generateFeedToken();
  const { error } = await db
    .from("calendar_feed_tokens")
    .upsert(
      { token, book_club_id: bookClubId, user_id: userId },
      { onConflict: "user_id,book_club_id" }
    );
  if (error) throw error;
  return token;
}

export interface ClubFeed {
  clubName: string;
  meetings: CalendarMeeting[];
}

/**
 * The club and recent and upcoming meetings a feed token can see, or null if
 * the token is unknown or its owner is no longer a member.
 */
export async function getClubFeed(
  db: Db,
  token: string,
  now = new Date()
): Promise<ClubFeed | null> {
  if (!isWellFormedFeedToken(token)) return null;

  const { data: feed, error } = await db
    .from("calendar_feed_tokens")
    .select("user_id, book_clubs!inner (id, name)")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  if (!feed) return null;

  const club = feed.book_clubs;
  if (!(await isMember(db, club.id, feed.user_id))) return null;

  const { data: meetings, error: meetingsError } = await db
    .from("meetings")
    .select(
      `id, meeting_date, updated_at, is_finalized, details,
       themes (name),
       selected_book:books!meetings_selected_book_id_fkey (title, author)`
    )
    .eq("book_club_id", club.id)
    .gte("meeting_date", feedHistoryStart(now).toISOString())
    .order("meeting_date", { ascending: true });
  if (meetingsError) throw meetingsError;

  return {
    clubName: club.name,
    meetings: meetings.map((meeting) => ({
      id: meeting.id,
      meetingDate: meeting.meeting_date,
      updatedAt: meeting.updated_at,
      isFinalized: meeting.is_finalized === true,
      details: meeting.details,
      themeName: meeting.themes?.name ?? null,
      book: meeting.selected_book
        ? {
            title: meeting.selected_book.title,
            author: meeting.selected_book.author,
          }
        : null,
    })),
  };
}
