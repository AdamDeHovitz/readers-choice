"use server";

import { revalidatePath } from "next/cache";
import { validateRankedBallot } from "@/lib/ballot-validation";
import { UserError } from "@/lib/user-error";
import { runAction, type ActionResult } from "@/server/action";
import { throwIfDbError } from "@/server/errors";
import { getBookOptionContext, getMeetingContext } from "@/server/meetings";
import {
  assertCanVote,
  calculateMeetingResults,
  isVotingMethod,
  type RankedVote,
  type VotingMethod,
  type VotingResults,
} from "@/server/voting";

/** Toggle the viewer's approval vote for a book option. */
export async function voteForBook(bookOptionId: string): Promise<ActionResult> {
  return runAction("Failed to vote", async ({ db, userId }) => {
    const option = await getBookOptionContext(db, bookOptionId);
    await assertCanVote(db, option.meeting, userId);

    // Atomic; re-checks the voting window in the database.
    const { error } = await db.rpc("toggle_book_vote", {
      p_book_option_id: bookOptionId,
      p_user_id: userId,
    });
    throwIfDbError(error);

    revalidatePath(`/meetings/${option.meeting.id}`);
  });
}

/** Switch the viewer's voting method; clears votes cast the other way. */
export async function setVotingMethod(
  meetingId: string,
  method: VotingMethod
): Promise<ActionResult> {
  return runAction("Failed to set voting method", async ({ db, userId }) => {
    if (!isVotingMethod(method)) throw new UserError("Invalid voting method");
    await assertCanVote(db, await getMeetingContext(db, meetingId), userId);

    const { error } = await db.rpc("set_meeting_voting_method", {
      p_meeting_id: meetingId,
      p_user_id: userId,
      p_method: method,
    });
    throwIfDbError(error);

    revalidatePath(`/meetings/${meetingId}`);
  });
}

/** Replace the viewer's ranked-choice ballot for a meeting. */
export async function saveRankedVotes(
  meetingId: string,
  rankings: RankedVote[]
): Promise<ActionResult> {
  return runAction("Failed to save ranked votes", async ({ db, userId }) => {
    if (!Array.isArray(rankings)) throw new UserError("Invalid ballot");
    await assertCanVote(db, await getMeetingContext(db, meetingId), userId);

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

    revalidatePath(`/meetings/${meetingId}`);
  });
}

/** A meeting's Hybrid IRV results; null data if the viewer can't see them. */
export async function getMeetingResults(
  meetingId: string
): Promise<ActionResult<VotingResults | null>> {
  return runAction("Failed to load voting results", ({ db, userId }) =>
    calculateMeetingResults(db, meetingId, userId)
  );
}
