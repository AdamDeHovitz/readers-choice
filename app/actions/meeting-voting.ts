"use server";

import { auth } from "@/auth";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

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
 * Set user's voting method preference for a meeting
 * Clears existing votes when switching methods
 */
export async function setVotingMethod(
  meetingId: string,
  method: "approval" | "ranked"
): Promise<{ success?: boolean; error?: string }> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const supabase = getAdminClient();

    // Verify user is a member and meeting is not finalized
    const { data: meeting } = await supabase
      .from("meetings")
      .select("book_club_id, is_finalized")
      .eq("id", meetingId)
      .single();

    if (!meeting) {
      return { error: "Meeting not found" };
    }

    if (meeting.is_finalized) {
      return { error: "Voting has closed" };
    }

    const { data: member } = await supabase
      .from("members")
      .select("user_id")
      .eq("book_club_id", meeting.book_club_id)
      .eq("user_id", session.user.id)
      .single();

    if (!member) {
      return { error: "Only members can vote" };
    }

    // Get current preference to see if we're switching
    const { data: currentPref } = await supabase
      .from("meeting_voting_preferences")
      .select("voting_method")
      .eq("meeting_id", meetingId)
      .eq("user_id", session.user.id)
      .single();

    const currentMethod = currentPref?.voting_method;

    // Clear existing votes when switching methods
    if (currentMethod && currentMethod !== method) {
      if (currentMethod === "approval") {
        // Get book options for this meeting and delete user's approval votes
        const { data: bookOptions } = await supabase
          .from("book_options")
          .select("id")
          .eq("meeting_id", meetingId);

        if (bookOptions && bookOptions.length > 0) {
          await supabase
            .from("votes")
            .delete()
            .eq("user_id", session.user.id)
            .in(
              "book_option_id",
              bookOptions.map((bo) => bo.id)
            );
        }
      } else {
        // Delete user's ranked votes
        await supabase
          .from("meeting_ranked_votes")
          .delete()
          .eq("meeting_id", meetingId)
          .eq("user_id", session.user.id);
      }
    }

    // Upsert voting preference
    const { error } = await supabase.from("meeting_voting_preferences").upsert(
      {
        meeting_id: meetingId,
        user_id: session.user.id,
        voting_method: method,
      },
      {
        onConflict: "meeting_id,user_id",
      }
    );

    if (error) throw error;

    revalidatePath(`/meetings/${meetingId}`);
    return { success: true };
  } catch (error) {
    console.error("Error setting voting method:", error);
    return { error: "Failed to set voting method" };
  }
}

/**
 * Save ranked choice votes for a meeting
 */
export async function saveRankedVotes(
  meetingId: string,
  rankings: { bookOptionId: string; rank: number }[]
): Promise<{ success?: boolean; error?: string }> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const supabase = getAdminClient();

    // Verify user is a member and meeting is not finalized
    const { data: meeting } = await supabase
      .from("meetings")
      .select("book_club_id, is_finalized")
      .eq("id", meetingId)
      .single();

    if (!meeting) {
      return { error: "Meeting not found" };
    }

    if (meeting.is_finalized) {
      return { error: "Voting has closed" };
    }

    const { data: member } = await supabase
      .from("members")
      .select("user_id")
      .eq("book_club_id", meeting.book_club_id)
      .eq("user_id", session.user.id)
      .single();

    if (!member) {
      return { error: "Only members can vote" };
    }

    // Delete existing ranked votes for this user/meeting
    await supabase
      .from("meeting_ranked_votes")
      .delete()
      .eq("meeting_id", meetingId)
      .eq("user_id", session.user.id);

    // Insert new ranked votes
    if (rankings.length > 0) {
      const { error } = await supabase.from("meeting_ranked_votes").insert(
        rankings.map((r) => ({
          meeting_id: meetingId,
          user_id: session.user.id,
          book_option_id: r.bookOptionId,
          rank: r.rank,
        }))
      );

      if (error) throw error;
    }

    // Ensure voting preference is set to ranked
    await supabase.from("meeting_voting_preferences").upsert(
      {
        meeting_id: meetingId,
        user_id: session.user.id,
        voting_method: "ranked",
      },
      {
        onConflict: "meeting_id,user_id",
      }
    );

    revalidatePath(`/meetings/${meetingId}`);
    return { success: true };
  } catch (error) {
    console.error("Error saving ranked votes:", error);
    return { error: "Failed to save ranked votes" };
  }
}

/**
 * Calculate meeting voting results using Hybrid IRV algorithm
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

    // Verify user is a member
    const { data: meeting } = await supabase
      .from("meetings")
      .select("book_club_id")
      .eq("id", meetingId)
      .single();

    if (!meeting) return null;

    const { data: member } = await supabase
      .from("members")
      .select("user_id")
      .eq("book_club_id", meeting.book_club_id)
      .eq("user_id", session.user.id)
      .single();

    if (!member) return null;

    // Get all book options with details
    const { data: bookOptions } = await supabase
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
      .eq("meeting_id", meetingId);

    if (!bookOptions || bookOptions.length === 0) {
      return null;
    }

    const bookDetails = bookOptions.map((bo: any) => ({
      bookOptionId: bo.id,
      bookId: bo.books.id,
      title: bo.books.title,
      author: bo.books.author,
      coverUrl: bo.books.cover_url,
    }));

    // Get approval votes (grouped by user)
    const { data: approvalVotes } = await supabase
      .from("votes")
      .select("user_id, book_option_id")
      .in(
        "book_option_id",
        bookOptions.map((bo: any) => bo.id)
      );

    // Get ranked votes (grouped by user)
    const { data: rankedVotes } = await supabase
      .from("meeting_ranked_votes")
      .select("user_id, book_option_id, rank")
      .eq("meeting_id", meetingId)
      .order("rank", { ascending: true });

    // Get voting preferences
    const { data: votingPrefs } = await supabase
      .from("meeting_voting_preferences")
      .select("user_id, voting_method")
      .eq("meeting_id", meetingId);

    // Build voter data structures
    const approvalByUser: Record<string, string[]> = {};
    const rankedByUser: Record<
      string,
      { bookOptionId: string; rank: number }[]
    > = {};
    const userMethod: Record<string, "approval" | "ranked"> = {};

    // Process voting preferences
    votingPrefs?.forEach((pref) => {
      userMethod[pref.user_id] = pref.voting_method as "approval" | "ranked";
    });

    // Process approval votes
    approvalVotes?.forEach((vote) => {
      // Only count if user is using approval method (or has no preference set)
      if (userMethod[vote.user_id] !== "ranked") {
        if (!approvalByUser[vote.user_id]) {
          approvalByUser[vote.user_id] = [];
        }
        approvalByUser[vote.user_id].push(vote.book_option_id);
        if (!userMethod[vote.user_id]) {
          userMethod[vote.user_id] = "approval";
        }
      }
    });

    // Process ranked votes
    rankedVotes?.forEach((vote) => {
      if (!rankedByUser[vote.user_id]) {
        rankedByUser[vote.user_id] = [];
      }
      rankedByUser[vote.user_id].push({
        bookOptionId: vote.book_option_id,
        rank: vote.rank,
      });
      userMethod[vote.user_id] = "ranked";
    });

    const approvalVoterCount = Object.keys(approvalByUser).length;
    const rankedVoterCount = Object.keys(rankedByUser).length;
    const totalVoters = new Set([
      ...Object.keys(approvalByUser),
      ...Object.keys(rankedByUser),
    ]).size;

    // Run IRV algorithm
    const rounds: EliminationRound[] = [];
    const eliminatedBooks = new Set<string>();
    const exhaustedUsers = new Set<string>();
    let roundNumber = 0;
    let winner: string | null = null;

    const activeBookIds = new Set(bookOptions.map((bo: any) => bo.id));

    while (activeBookIds.size > 1 && !winner) {
      roundNumber++;

      // Calculate support for each active book
      const bookSupport: Record<
        string,
        { support: number; firstChoiceVotes: number }
      > = {};
      activeBookIds.forEach((id) => {
        bookSupport[id] = { support: 0, firstChoiceVotes: 0 };
      });

      // Count approval votes (each approved book that's still active gets support)
      Object.entries(approvalByUser).forEach(([userId, approvedBooks]) => {
        if (exhaustedUsers.has(userId)) return;

        const activeApproved = approvedBooks.filter((bid) =>
          activeBookIds.has(bid)
        );
        if (activeApproved.length === 0) {
          exhaustedUsers.add(userId);
          return;
        }

        // Each active approved book gets +1 support
        activeApproved.forEach((bid) => {
          bookSupport[bid].support++;
          // For approval votes, all are "first choice" equally
          bookSupport[bid].firstChoiceVotes++;
        });
      });

      // Count ranked votes (only top remaining choice gets support)
      Object.entries(rankedByUser).forEach(([userId, rankings]) => {
        if (exhaustedUsers.has(userId)) return;

        // Find top remaining choice
        const sortedRankings = rankings
          .filter((r) => activeBookIds.has(r.bookOptionId))
          .sort((a, b) => a.rank - b.rank);

        if (sortedRankings.length === 0) {
          exhaustedUsers.add(userId);
          return;
        }

        const topChoice = sortedRankings[0].bookOptionId;
        bookSupport[topChoice].support++;
        bookSupport[topChoice].firstChoiceVotes++;
      });

      // Calculate majority threshold (>50% of non-exhausted voters)
      const activeVoters = totalVoters - exhaustedUsers.size;
      const majorityThreshold = Math.floor(activeVoters / 2) + 1;

      // Check for winner
      const supportArray = Object.entries(bookSupport).map(([id, s]) => ({
        bookOptionId: id,
        support: s.support,
        firstChoiceVotes: s.firstChoiceVotes,
      }));

      supportArray.sort((a, b) => b.support - a.support);

      const round: EliminationRound = {
        round: roundNumber,
        bookSupport: supportArray,
        eliminated: null,
        transfers: [],
        exhaustedVoters: exhaustedUsers.size,
        activeVoters,
        majorityThreshold,
        winner: null,
      };

      // Check if leader has majority
      if (supportArray[0].support >= majorityThreshold) {
        winner = supportArray[0].bookOptionId;
        round.winner = winner;
        rounds.push(round);
        break;
      }

      // No majority - eliminate lowest support book
      const lowestSupport = supportArray[supportArray.length - 1].support;
      const tiedForLowest = supportArray.filter(
        (s) => s.support === lowestSupport
      );

      let toEliminate: string;
      let eliminationReason:
        | "lowest_support"
        | "tiebreaker_first_choice"
        | "tiebreaker_approval"
        | "tiebreaker_random" = "lowest_support";

      if (tiedForLowest.length === 1) {
        toEliminate = tiedForLowest[0].bookOptionId;
      } else {
        // Tiebreaker 1: Fewest first-choice votes
        const minFirstChoice = Math.min(
          ...tiedForLowest.map((t) => t.firstChoiceVotes)
        );
        const tiedByFirstChoice = tiedForLowest.filter(
          (t) => t.firstChoiceVotes === minFirstChoice
        );

        if (tiedByFirstChoice.length === 1) {
          toEliminate = tiedByFirstChoice[0].bookOptionId;
          eliminationReason = "tiebreaker_first_choice";
        } else {
          // Tiebreaker 2: Fewest total approval votes (across all rounds)
          const approvalCounts: Record<string, number> = {};
          tiedByFirstChoice.forEach((t) => {
            approvalCounts[t.bookOptionId] = 0;
          });

          Object.values(approvalByUser).forEach((approvedBooks) => {
            approvedBooks.forEach((bid) => {
              if (approvalCounts[bid] !== undefined) {
                approvalCounts[bid]++;
              }
            });
          });

          const minApproval = Math.min(...Object.values(approvalCounts));
          const tiedByApproval = tiedByFirstChoice.filter(
            (t) => approvalCounts[t.bookOptionId] === minApproval
          );

          if (tiedByApproval.length === 1) {
            toEliminate = tiedByApproval[0].bookOptionId;
            eliminationReason = "tiebreaker_approval";
          } else {
            // Tiebreaker 3: Random
            toEliminate =
              tiedByApproval[Math.floor(Math.random() * tiedByApproval.length)]
                .bookOptionId;
            eliminationReason = "tiebreaker_random";
          }
        }
      }

      // Record transfers from ranked voters
      const transfers: EliminationRound["transfers"] = [];
      Object.entries(rankedByUser).forEach(([userId, rankings]) => {
        if (exhaustedUsers.has(userId)) return;

        const sortedRankings = rankings
          .filter((r) => activeBookIds.has(r.bookOptionId))
          .sort((a, b) => a.rank - b.rank);

        if (
          sortedRankings.length > 0 &&
          sortedRankings[0].bookOptionId === toEliminate
        ) {
          // This voter's top choice is being eliminated
          const nextChoice = sortedRankings.find(
            (r) =>
              r.bookOptionId !== toEliminate &&
              activeBookIds.has(r.bookOptionId)
          );

          if (nextChoice) {
            const existingTransfer = transfers.find(
              (t) =>
                t.fromBookOptionId === toEliminate &&
                t.toBookOptionId === nextChoice.bookOptionId
            );
            if (existingTransfer) {
              existingTransfer.count++;
            } else {
              transfers.push({
                fromBookOptionId: toEliminate,
                toBookOptionId: nextChoice.bookOptionId,
                count: 1,
              });
            }
          }
        }
      });

      round.eliminated = {
        bookOptionId: toEliminate,
        reason: eliminationReason,
      };
      round.transfers = transfers;
      rounds.push(round);

      // Remove eliminated book
      activeBookIds.delete(toEliminate);
      eliminatedBooks.add(toEliminate);
    }

    // If only one book left, it wins by default
    if (!winner && activeBookIds.size === 1) {
      winner = Array.from(activeBookIds)[0];
      // Add final round showing the winner
      if (rounds.length > 0 && !rounds[rounds.length - 1].winner) {
        rounds[rounds.length - 1].winner = winner;
      }
    }

    const winnerBook = winner
      ? bookDetails.find((b) => b.bookOptionId === winner)
      : null;
    const winningRound = rounds.find((r) => r.winner === winner);

    return {
      winner: winnerBook
        ? {
            bookOptionId: winner!,
            bookTitle: winnerBook.title,
            finalSupport:
              winningRound?.bookSupport.find((s) => s.bookOptionId === winner)
                ?.support || 0,
            wonInRound: winningRound?.round || rounds.length,
          }
        : null,
      rounds,
      voterBreakdown: {
        approvalVoters: approvalVoterCount,
        rankedVoters: rankedVoterCount,
        totalVoters,
      },
      bookDetails,
    };
  } catch (error) {
    console.error("Error calculating meeting results:", error);
    return null;
  }
}
