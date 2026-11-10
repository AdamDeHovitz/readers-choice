"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/server/action";
import { getBookOptionContext, getMeetingContext } from "@/server/meetings";
import * as voting from "@/server/voting";

/** Toggle the viewer's approval vote for a book option. */
export async function voteForBook(bookOptionId: string): Promise<ActionResult> {
  return runAction("Failed to vote", async ({ db, userId }) => {
    const option = await getBookOptionContext(db, bookOptionId);
    await voting.assertCanVote(db, option.meeting, userId);
    await voting.toggleApprovalVote(db, bookOptionId, userId);

    revalidatePath(`/meetings/${option.meeting.id}`);
  });
}

/** Switch the viewer's voting method; clears votes cast the other way. */
export async function setVotingMethod(
  meetingId: string,
  method: voting.VotingMethod
): Promise<ActionResult> {
  return runAction("Failed to set voting method", async ({ db, userId }) => {
    const meeting = await getMeetingContext(db, meetingId);
    await voting.assertCanVote(db, meeting, userId);
    await voting.setVotingMethod(db, meetingId, userId, method);

    revalidatePath(`/meetings/${meetingId}`);
  });
}

/** Replace the viewer's ranked-choice ballot for a meeting. */
export async function saveRankedVotes(
  meetingId: string,
  rankings: voting.RankedVote[]
): Promise<ActionResult> {
  return runAction("Failed to save ranked votes", async ({ db, userId }) => {
    const meeting = await getMeetingContext(db, meetingId);
    await voting.assertCanVote(db, meeting, userId);
    await voting.saveRankedBallot(db, meetingId, userId, rankings);

    revalidatePath(`/meetings/${meetingId}`);
  });
}

/** A meeting's Hybrid IRV results; null data if the viewer can't see them. */
export async function getMeetingResults(
  meetingId: string
): Promise<ActionResult<voting.VotingResults | null>> {
  return runAction("Failed to load voting results", ({ db, userId }) =>
    voting.calculateMeetingResults(db, meetingId, userId)
  );
}
