"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@readers-choice/contract/result";
import { runAction } from "@/server/action";
import { requireMember } from "@/server/authz";
import * as rankings from "@/server/rankings";

/** How each member ranked one book in a year. */
export async function getIndividualBookRankings(
  bookClubId: string,
  bookId: string,
  year: number
): Promise<ActionResult<rankings.IndividualRanking[]>> {
  return runAction("Failed to load rankings", (viewer) =>
    rankings.getIndividualBookRankings(viewer, bookClubId, bookId, year)
  );
}

/** Replace the viewer's rankings for a year. */
export async function saveYearRankings(
  bookClubId: string,
  year: number,
  rankedBooks: { bookId: string; rank: number }[],
  unreadBooks: string[]
): Promise<ActionResult> {
  return runAction("Failed to save rankings", async ({ db, userId }) => {
    await requireMember(
      db,
      bookClubId,
      userId,
      "You must be a member to save rankings"
    );
    await rankings.saveYearRankings(
      db,
      userId,
      bookClubId,
      year,
      rankedBooks,
      unreadBooks
    );

    revalidatePath(`/book-clubs/${bookClubId}/rankings`);
  });
}
