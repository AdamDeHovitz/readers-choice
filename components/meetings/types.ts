/** Book data as shown on a meeting's voting page (with any per-nomination overrides applied). */
export interface MeetingBook {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  description: string | null;
  pageCount: number | null;
  publishedYear: number | null;
}

/** A book nominated as an option for a meeting. */
export interface MeetingBookOption {
  id: string;
  book: MeetingBook;
}

/** A book option with approval-vote tallies for the current user. */
export interface MeetingBookOptionWithVotes extends MeetingBookOption {
  voteCount: number;
  userHasVoted: boolean;
}
