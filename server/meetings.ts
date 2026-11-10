import "server-only";
import type { MeetingSchedule } from "@/lib/meeting-schedule";
import { UserError } from "@/lib/user-error";
import { getMembership, isMember } from "./authz";
import { toBook, type Book } from "./books";
import type { Db } from "./db";
import type { Viewer } from "./viewer";

/** The parts of a meeting that authorization and phase checks need. */
export interface MeetingContext extends MeetingSchedule {
  id: string;
  bookClubId: string;
}

const MEETING_CONTEXT_COLUMNS =
  "id, book_club_id, is_finalized, nomination_deadline, voting_deadline" as const;

function toMeetingContext(row: {
  id: string;
  book_club_id: string | null;
  is_finalized: boolean | null;
  nomination_deadline: string | null;
  voting_deadline: string | null;
}): MeetingContext {
  // A meeting outside any club can't be authorized; treat it as missing.
  if (!row.book_club_id) throw new UserError("Meeting not found");
  return {
    id: row.id,
    bookClubId: row.book_club_id,
    isFinalized: row.is_finalized,
    nominationDeadline: row.nomination_deadline,
    votingDeadline: row.voting_deadline,
  };
}

/** Load a meeting's club and schedule; throws if it doesn't exist. */
export async function getMeetingContext(
  db: Db,
  meetingId: string
): Promise<MeetingContext> {
  const { data, error } = await db
    .from("meetings")
    .select(MEETING_CONTEXT_COLUMNS)
    .eq("id", meetingId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new UserError("Meeting not found");
  return toMeetingContext(data);
}

export interface BookOptionContext {
  id: string;
  addedBy: string | null;
  meeting: MeetingContext;
}

/** Load a book option and its meeting; throws if it doesn't exist. */
export async function getBookOptionContext(
  db: Db,
  bookOptionId: string
): Promise<BookOptionContext> {
  const { data, error } = await db
    .from("book_options")
    .select(`id, added_by, meetings!inner (${MEETING_CONTEXT_COLUMNS})`)
    .eq("id", bookOptionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new UserError("Book option not found");
  return {
    id: data.id,
    addedBy: data.added_by,
    meeting: toMeetingContext(data.meetings),
  };
}

export interface MeetingSummary extends MeetingSchedule {
  id: string;
  isFinalized: boolean;
  meetingDate: string;
  finalizedAt: string | null;
  selectedBookId: string | null;
  createdAt: string | null;
  details: string | null;
  theme: { id: string; name: string } | null;
  selectedBook: Book | null;
}

/** A club's meetings, newest first; empty unless the viewer is a member. */
export async function getBookClubMeetings(
  { db, userId }: Viewer,
  bookClubId: string
): Promise<MeetingSummary[]> {
  if (!(await isMember(db, bookClubId, userId))) return [];

  const { data, error } = await db
    .from("meetings")
    .select(
      `id, meeting_date, nomination_deadline, voting_deadline, is_finalized,
       finalized_at, selected_book_id, created_at, details,
       themes (id, name),
       selected_book:books!meetings_selected_book_id_fkey (
         id, title, author, cover_url, description, page_count, published_year
       )`
    )
    .eq("book_club_id", bookClubId)
    .order("meeting_date", { ascending: false });
  if (error) throw error;

  return data.map((meeting) => ({
    id: meeting.id,
    meetingDate: meeting.meeting_date,
    nominationDeadline: meeting.nomination_deadline,
    votingDeadline: meeting.voting_deadline,
    isFinalized: meeting.is_finalized === true,
    finalizedAt: meeting.finalized_at,
    selectedBookId: meeting.selected_book_id,
    createdAt: meeting.created_at,
    details: meeting.details,
    theme: meeting.themes,
    selectedBook: meeting.selected_book ? toBook(meeting.selected_book) : null,
  }));
}

/** A book nominated as an option for a meeting. */
export interface MeetingBookOption {
  id: string;
  /** The book, with any per-nomination description/page count applied. */
  book: Book;
  /** User id of the member who nominated it. */
  addedBy: string | null;
  nominatorName: string | null;
  /** Plain-text note the nominator attached (never HTML). */
  nominationNote: string | null;
}

/** A book option with approval-vote tallies for the viewer. */
export interface MeetingBookOptionWithVotes extends MeetingBookOption {
  voteCount: number;
  userHasVoted: boolean;
  createdAt: string | null;
}

export interface MeetingDetails extends MeetingSchedule {
  id: string;
  isFinalized: boolean;
  meetingDate: string;
  finalizedAt: string | null;
  selectedBookId: string | null;
  selectedBook: Book | null;
  details: string | null;
  bookClub: { id: string; name: string };
  theme: { id: string; name: string } | null;
  bookOptions: MeetingBookOptionWithVotes[];
  currentUserIsAdmin: boolean;
}

/** A meeting with its options and votes; null unless the viewer is a member. */
export async function getMeetingDetails(
  { db, userId }: Viewer,
  meetingId: string
): Promise<MeetingDetails | null> {
  const { data: meeting, error } = await db
    .from("meetings")
    .select(
      `id, meeting_date, nomination_deadline, voting_deadline, is_finalized,
       finalized_at, selected_book_id, details,
       book_clubs!inner (id, name),
       themes (id, name),
       selected_book:books!meetings_selected_book_id_fkey (
         id, title, author, cover_url, description, page_count, published_year
       )`
    )
    .eq("id", meetingId)
    .maybeSingle();
  if (error) throw error;
  if (!meeting) return null;

  const [membership, optionsResult] = await Promise.all([
    getMembership(db, meeting.book_clubs.id, userId),
    db
      .from("book_options")
      .select(
        `id, created_at, added_by, description_override, page_count_override,
         nomination_note,
         nominator:users!book_options_added_by_fkey (name),
         books!inner (id, title, author, cover_url, published_year),
         votes (user_id)`
      )
      .eq("meeting_id", meetingId),
  ]);
  if (!membership) return null;
  if (optionsResult.error) throw optionsResult.error;

  return {
    id: meeting.id,
    meetingDate: meeting.meeting_date,
    nominationDeadline: meeting.nomination_deadline,
    votingDeadline: meeting.voting_deadline,
    isFinalized: meeting.is_finalized === true,
    finalizedAt: meeting.finalized_at,
    selectedBookId: meeting.selected_book_id,
    selectedBook: meeting.selected_book ? toBook(meeting.selected_book) : null,
    details: meeting.details,
    bookClub: meeting.book_clubs,
    theme: meeting.themes,
    bookOptions: optionsResult.data.map((option) => ({
      id: option.id,
      book: toBook({
        ...option.books,
        description: option.description_override,
        page_count: option.page_count_override,
      }),
      voteCount: option.votes.length,
      userHasVoted: option.votes.some((vote) => vote.user_id === userId),
      createdAt: option.created_at,
      addedBy: option.added_by,
      nominatorName: option.nominator?.name ?? null,
      nominationNote: option.nomination_note,
    })),
    currentUserIsAdmin: membership.isAdmin,
  };
}
