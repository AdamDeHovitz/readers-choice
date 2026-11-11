import "server-only";
import { validateRankedBallot } from "@readers-choice/core/ballot-validation";
import {
  buildMeetingBallots,
  seedFromString,
  type VotingMethod,
} from "@readers-choice/core/meeting-ballots";
import { isVotingClosed } from "@readers-choice/core/meeting-schedule";
import { UserError } from "@readers-choice/core/user-error";
import { runHybridIRV } from "@readers-choice/core/voting-algorithm";
import { requireMember } from "./authz";
import type { Db } from "./db";
import { throwIfDbError } from "./errors";
import { getMeetingContext, type MeetingContext } from "./meetings";
import type { Viewer } from "./viewer";

export type { VotingMethod };

export function isVotingMethod(value: unknown): value is VotingMethod {
  return value === "approval" || value === "ranked";
}

/**
 * Throw unless the user may vote in the meeting right now. The database
 * functions re-check this atomically; this gives precise errors up front.
 */
export async function assertCanVote(
  db: Db,
  meeting: MeetingContext,
  userId: string
): Promise<void> {
  if (isVotingClosed(meeting)) throw new UserError("Voting has closed");
  await requireMember(db, meeting.bookClubId, userId, "Only members can vote");
}

/** The viewer's chosen voting method for a meeting, if they've picked one. */
export async function getUserVotingPreference(
  { db, userId }: Viewer,
  meetingId: string
): Promise<VotingMethod | null> {
  const { data, error } = await db
    .from("meeting_voting_preferences")
    .select("voting_method")
    .eq("meeting_id", meetingId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return isVotingMethod(data?.voting_method) ? data.voting_method : null;
}

export interface RankedVote {
  bookOptionId: string;
  rank: number;
}

/** The viewer's ranked ballot for a meeting, best first. */
export async function getUserRankedVotes(
  { db, userId }: Viewer,
  meetingId: string
): Promise<RankedVote[]> {
  const { data, error } = await db
    .from("meeting_ranked_votes")
    .select("book_option_id, rank")
    .eq("meeting_id", meetingId)
    .eq("user_id", userId)
    .order("rank", { ascending: true });
  if (error) throw error;
  return data.map((v) => ({ bookOptionId: v.book_option_id, rank: v.rank }));
}

export type EliminationReason =
  | "lowest_support"
  | "tiebreaker_first_choice"
  | "tiebreaker_approval"
  | "tiebreaker_random";

export interface EliminationRound {
  round: number;
  bookSupport: {
    bookOptionId: string;
    support: number;
    firstChoiceVotes: number;
  }[];
  eliminated: { bookOptionId: string; reason: EliminationReason } | null;
  transfers: {
    fromBookOptionId: string;
    toBookOptionId: string;
    count: number;
  }[];
  exhaustedVoters: number;
  activeVoters: number;
  majorityThreshold: number;
  winner: string | null;
}

export interface VotingResults {
  winner: {
    bookOptionId: string;
    bookTitle: string;
    finalSupport: number;
    wonInRound: number;
  } | null;
  rounds: EliminationRound[];
  voterBreakdown: {
    approvalVoters: number;
    rankedVoters: number;
    totalVoters: number;
  };
  bookDetails: {
    bookOptionId: string;
    bookId: string;
    title: string;
    author: string;
    coverUrl: string | null;
  }[];
}

/**
 * Calculate a meeting's results with the Hybrid IRV algorithm.
 *
 * Only current members' ballots count, each in the pool matching the voter's
 * voting preference. Random tie-breaks are seeded from the meeting ID so the
 * outcome is stable across requests. Returns null when the meeting has no
 * options or the user isn't a member.
 */
export async function calculateMeetingResults(
  db: Db,
  meetingId: string,
  userId: string
): Promise<VotingResults | null> {
  const meeting = await getMeetingContext(db, meetingId);

  const { data: members, error: membersError } = await db
    .from("members")
    .select("user_id")
    .eq("book_club_id", meeting.bookClubId);
  if (membersError) throw membersError;

  const memberIds = new Set(
    members.flatMap((m) => (m.user_id ? [m.user_id] : []))
  );
  if (!memberIds.has(userId)) return null;

  const { data: options, error: optionsError } = await db
    .from("book_options")
    .select("id, books!inner (id, title, author, cover_url)")
    .eq("meeting_id", meetingId)
    .order("id", { ascending: true });
  if (optionsError) throw optionsError;

  const bookDetails = options.map((option) => ({
    bookOptionId: option.id,
    bookId: option.books.id,
    title: option.books.title,
    author: option.books.author,
    coverUrl: option.books.cover_url,
  }));
  if (bookDetails.length === 0) return null;

  const optionIds = bookDetails.map((b) => b.bookOptionId);

  const [approvalRes, rankedRes, prefsRes] = await Promise.all([
    db
      .from("votes")
      .select("user_id, book_option_id")
      .in("book_option_id", optionIds),
    db
      .from("meeting_ranked_votes")
      .select("user_id, book_option_id, rank")
      .eq("meeting_id", meetingId),
    db
      .from("meeting_voting_preferences")
      .select("user_id, voting_method")
      .eq("meeting_id", meetingId),
  ]);
  if (approvalRes.error) throw approvalRes.error;
  if (rankedRes.error) throw rankedRes.error;
  if (prefsRes.error) throw prefsRes.error;

  const { approvalBallots, rankedBallots } = buildMeetingBallots({
    approvalVotes: approvalRes.data.flatMap(({ user_id, book_option_id }) =>
      user_id && book_option_id ? [{ user_id, book_option_id }] : []
    ),
    rankedVotes: rankedRes.data,
    preferences: prefsRes.data.flatMap(({ user_id, voting_method }) =>
      isVotingMethod(voting_method) ? [{ user_id, voting_method }] : []
    ),
    memberIds,
  });

  if (approvalBallots.length === 0 && rankedBallots.length === 0) {
    return {
      winner: null,
      rounds: [],
      voterBreakdown: { approvalVoters: 0, rankedVoters: 0, totalVoters: 0 },
      bookDetails,
    };
  }

  const result = runHybridIRV(
    optionIds,
    approvalBallots,
    rankedBallots,
    seedFromString(meetingId)
  );

  const rounds: EliminationRound[] = result.rounds.map((r) => ({
    round: r.round,
    bookSupport: r.bookSupport.map((s) => ({
      bookOptionId: s.bookId,
      support: s.support,
      firstChoiceVotes: s.firstChoiceVotes,
    })),
    eliminated: r.eliminated
      ? { bookOptionId: r.eliminated.bookId, reason: r.eliminated.reason }
      : null,
    transfers: r.transfers.map((t) => ({
      fromBookOptionId: t.fromBookId,
      toBookOptionId: t.toBookId,
      count: t.count,
    })),
    exhaustedVoters: r.exhaustedVoters,
    activeVoters: r.activeVoters,
    majorityThreshold: r.majorityThreshold,
    winner: r.winner,
  }));

  const winnerId = result.winner;
  const winnerBook = bookDetails.find((b) => b.bookOptionId === winnerId);
  const winningRound = rounds.find((r) => r.winner === winnerId);

  return {
    winner:
      winnerId && winnerBook
        ? {
            bookOptionId: winnerId,
            bookTitle: winnerBook.title,
            finalSupport:
              winningRound?.bookSupport.find((s) => s.bookOptionId === winnerId)
                ?.support ?? 0,
            wonInRound: winningRound?.round ?? rounds.length,
          }
        : null,
    rounds,
    voterBreakdown: result.voterBreakdown,
    bookDetails,
  };
}

/** Toggle a user's approval vote. Atomic; re-checks the voting window. */
export async function toggleApprovalVote(
  db: Db,
  bookOptionId: string,
  userId: string
): Promise<void> {
  const { error } = await db.rpc("toggle_book_vote", {
    p_book_option_id: bookOptionId,
    p_user_id: userId,
  });
  throwIfDbError(error);
}

/** Switch a user's voting method; clears votes cast the other way. */
export async function setVotingMethod(
  db: Db,
  meetingId: string,
  userId: string,
  method: VotingMethod
): Promise<void> {
  if (!isVotingMethod(method)) throw new UserError("Invalid voting method");
  const { error } = await db.rpc("set_meeting_voting_method", {
    p_meeting_id: meetingId,
    p_user_id: userId,
    p_method: method,
  });
  throwIfDbError(error);
}

/**
 * Replace a user's ranked ballot. Every option must belong to the meeting
 * and ranks must be 1..N; the database re-checks the structure atomically.
 */
export async function saveRankedBallot(
  db: Db,
  meetingId: string,
  userId: string,
  rankings: readonly RankedVote[]
): Promise<void> {
  if (!Array.isArray(rankings)) throw new UserError("Invalid ballot");

  const { data: options, error: optionsError } = await db
    .from("book_options")
    .select("id")
    .eq("meeting_id", meetingId);
  if (optionsError) throw optionsError;

  const validation = validateRankedBallot(
    rankings,
    new Set(options.map((o) => o.id))
  );
  if (!validation.ok) throw new UserError(validation.error);

  const { error } = await db.rpc("save_meeting_ranked_votes", {
    p_meeting_id: meetingId,
    p_user_id: userId,
    p_rankings: rankings.map((r) => ({
      book_option_id: r.bookOptionId,
      rank: r.rank,
    })),
  });
  throwIfDbError(error);
}
