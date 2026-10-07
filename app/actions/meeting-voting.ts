"use server";

import { auth } from "@/auth";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { isVotingClosed, validateRankedBallot } from "@/lib/ballot-validation";
import { dbErrorMessage } from "@/lib/db-errors";
import { buildMeetingBallots, seedFromString } from "@/lib/meeting-ballots";
import { runHybridIRV } from "@/lib/voting-algorithm";

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

type AdminClient = ReturnType<typeof getAdminClient>;

export interface EliminationRound {
  round: number;
  bookSupport: {
    bookOptionId: string;
    support: number;
    firstChoiceVotes: number;
  }[];
  eliminated: {
    bookOptionId: string;
    reason:
      | "lowest_support"
      | "tiebreaker_first_choice"
      | "tiebreaker_approval"
      | "tiebreaker_random";
  } | null;
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
 * Get user's voting preference for a meeting
 */
export async function getUserVotingPreference(meetingId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const supabase = getAdminClient();

  const { data } = await supabase
    .from("meeting_voting_preferences")
    .select("voting_method")
    .eq("meeting_id", meetingId)
    .eq("user_id", session.user.id)
    .single();

  return data?.voting_method as "approval" | "ranked" | null;
}

/**
 * Get user's ranked votes for a meeting
 */
export async function getUserRankedVotes(meetingId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const supabase = getAdminClient();

  const { data } = await supabase
    .from("meeting_ranked_votes")
    .select("book_option_id, rank")
    .eq("meeting_id", meetingId)
    .eq("user_id", session.user.id)
    .order("rank", { ascending: true });

  return (
    data?.map((v) => ({
      bookOptionId: v.book_option_id,
      rank: v.rank,
    })) || []
  );
}

/**
 * Load a meeting and confirm the user may vote in it right now.
 * Returns an error message, or null when voting is allowed.
 * The database functions re-check this atomically; this pre-check returns
 * precise errors before any write is attempted.
 */
async function checkCanVote(
  supabase: AdminClient,
  meetingId: string,
  userId: string
): Promise<string | null> {
  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("book_club_id, is_finalized, voting_deadline")
    .eq("id", meetingId)
    .maybeSingle();

  if (meetingError) throw meetingError;
  if (!meeting) return "Meeting not found";
  if (isVotingClosed(meeting)) return "Voting has closed";

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("user_id")
    .eq("book_club_id", meeting.book_club_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError) throw memberError;
  if (!member) return "Only members can vote";

  return null;
}

/**
 * Set user's voting method preference for a meeting
 * Clears votes cast with the other method when switching
 */
export async function setVotingMethod(
  meetingId: string,
  method: "approval" | "ranked"
): Promise<{ success?: boolean; error?: string }> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (method !== "approval" && method !== "ranked") {
    return { error: "Invalid voting method" };
  }

  try {
    const supabase = getAdminClient();

    const denied = await checkCanVote(supabase, meetingId, session.user.id);
    if (denied) return { error: denied };

    const { error } = await supabase.rpc("set_meeting_voting_method", {
      p_meeting_id: meetingId,
      p_user_id: session.user.id,
      p_method: method,
    });

    if (error) {
      const message = dbErrorMessage(error);
      if (message) return { error: message };
      throw error;
    }

    revalidatePath(`/meetings/${meetingId}`);
    return { success: true };
  } catch (error) {
    console.error("Error setting voting method:", error);
    return { error: "Failed to set voting method" };
  }
}

/**
 * Save ranked choice votes for a meeting, replacing the user's ballot
 */
export async function saveRankedVotes(
  meetingId: string,
  rankings: { bookOptionId: string; rank: number }[]
): Promise<{ success?: boolean; error?: string }> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (!Array.isArray(rankings)) {
    return { error: "Invalid ballot" };
  }

  try {
    const supabase = getAdminClient();

    const denied = await checkCanVote(supabase, meetingId, session.user.id);
    if (denied) return { error: denied };

    const { data: options, error: optionsError } = await supabase
      .from("book_options")
      .select("id")
      .eq("meeting_id", meetingId);

    if (optionsError) throw optionsError;

    const validation = validateRankedBallot(
      rankings,
      new Set((options ?? []).map((o) => o.id as string))
    );
    if (!validation.ok) return { error: validation.error };

    const { error } = await supabase.rpc("save_meeting_ranked_votes", {
      p_meeting_id: meetingId,
      p_user_id: session.user.id,
      p_rankings: rankings.map((r) => ({
        book_option_id: r.bookOptionId,
        rank: r.rank,
      })),
    });

    if (error) {
      const message = dbErrorMessage(error);
      if (message) return { error: message };
      throw error;
    }

    revalidatePath(`/meetings/${meetingId}`);
    return { success: true };
  } catch (error) {
    console.error("Error saving ranked votes:", error);
    return { error: "Failed to save ranked votes" };
  }
}

interface BookSummary {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
}

interface BookOptionWithBook {
  id: string;
  books: BookSummary | BookSummary[] | null;
}

/**
 * Calculate meeting voting results using the Hybrid IRV algorithm.
 *
 * Only current members' ballots count, each in the pool matching the voter's
 * voting preference. Random tie-breaks are seeded from the meeting ID so the
 * outcome is stable across requests. With no ballots there is no winner.
 */
export async function calculateMeetingResults(
  meetingId: string
): Promise<VotingResults | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  try {
    const supabase = getAdminClient();

    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("book_club_id")
      .eq("id", meetingId)
      .maybeSingle();

    if (meetingError) throw meetingError;
    if (!meeting) return null;

    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("user_id")
      .eq("book_club_id", meeting.book_club_id);

    if (membersError) throw membersError;

    const memberIds = new Set((members ?? []).map((m) => m.user_id as string));
    if (!memberIds.has(session.user.id)) return null;

    const { data: bookOptionRows, error: optionsError } = await supabase
      .from("book_options")
      .select(
        `
        id,
        books!inner (
          id,
          title,
          author,
          cover_url
        )
      `
      )
      .eq("meeting_id", meetingId)
      .order("id", { ascending: true });

    if (optionsError) throw optionsError;

    const bookDetails = (
      (bookOptionRows ?? []) as unknown as BookOptionWithBook[]
    ).flatMap((bo) => {
      const book = Array.isArray(bo.books) ? bo.books[0] : bo.books;
      if (!book) return [];
      return [
        {
          bookOptionId: bo.id,
          bookId: book.id,
          title: book.title,
          author: book.author,
          coverUrl: book.cover_url,
        },
      ];
    });

    if (bookDetails.length === 0) {
      return null;
    }

    const optionIds = bookDetails.map((b) => b.bookOptionId);

    const [approvalRes, rankedRes, prefsRes] = await Promise.all([
      supabase
        .from("votes")
        .select("user_id, book_option_id")
        .in("book_option_id", optionIds),
      supabase
        .from("meeting_ranked_votes")
        .select("user_id, book_option_id, rank")
        .eq("meeting_id", meetingId),
      supabase
        .from("meeting_voting_preferences")
        .select("user_id, voting_method")
        .eq("meeting_id", meetingId),
    ]);

    if (approvalRes.error) throw approvalRes.error;
    if (rankedRes.error) throw rankedRes.error;
    if (prefsRes.error) throw prefsRes.error;

    const { approvalBallots, rankedBallots } = buildMeetingBallots({
      approvalVotes: approvalRes.data ?? [],
      rankedVotes: rankedRes.data ?? [],
      preferences: prefsRes.data ?? [],
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
    const winnerBook = winnerId
      ? bookDetails.find((b) => b.bookOptionId === winnerId)
      : undefined;
    const winningRound = rounds.find((r) => r.winner === winnerId);

    return {
      winner:
        winnerId && winnerBook
          ? {
              bookOptionId: winnerId,
              bookTitle: winnerBook.title,
              finalSupport:
                winningRound?.bookSupport.find(
                  (s) => s.bookOptionId === winnerId
                )?.support ?? 0,
              wonInRound: winningRound?.round ?? rounds.length,
            }
          : null,
      rounds,
      voterBreakdown: result.voterBreakdown,
      bookDetails,
    };
  } catch (error) {
    console.error("Error calculating meeting results:", error);
    return null;
  }
}
