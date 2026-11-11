"use server";

import { runAction, type ActionResult } from "@/server/action";
import { requireMember } from "@/server/authz";
import { getOrCreateFeedToken, resetFeedToken } from "@/server/calendar";

const MEMBERS_ONLY = "Only members can subscribe to the club calendar";

/** The viewer's calendar feed token for the club, creating one if needed. */
export async function getCalendarFeedToken(
  bookClubId: string
): Promise<ActionResult<{ token: string }>> {
  return runAction("Failed to load calendar link", async ({ db, userId }) => {
    await requireMember(db, bookClubId, userId, MEMBERS_ONLY);
    return { token: await getOrCreateFeedToken(db, bookClubId, userId) };
  });
}

/** Replace the viewer's feed token; their old calendar link stops working. */
export async function resetCalendarFeedToken(
  bookClubId: string
): Promise<ActionResult<{ token: string }>> {
  return runAction("Failed to reset calendar link", async ({ db, userId }) => {
    await requireMember(db, bookClubId, userId, MEMBERS_ONLY);
    return { token: await resetFeedToken(db, bookClubId, userId) };
  });
}
