"use server";

import { revalidatePath } from "next/cache";
import { validateYearRankings } from "@/lib/ballot-validation";
import { UserError } from "@/lib/user-error";
import { runAction, type ActionResult } from "@/server/action";
import { requireMember } from "@/server/authz";
import { throwIfDbError } from "@/server/errors";
import * as rankings from "@/server/rankings";

/** The club's picks for a year with the viewer's ranks. */
export async function getYearBooks(
  bookClubId: string,
  year: number
): Promise<ActionResult<rankings.YearBook[]>> {
  return runAction("Failed to load books", (viewer) =>
    rankings.getYearBooks(viewer, bookClubId, year)
  );
}

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

/**
 * Replace the viewer's rankings for a year. Ranks must be exactly 1..N, a
 * book can't be both ranked and unread, and every book must be one of the
 * club's finalized picks that (UTC) year.
 */
export async function saveYearRankings(
  bookClubId: string,
  year: number,
  rankedBooks: { bookId: string; rank: number }[],
  unreadBooks: string[]
): Promise<ActionResult> {
  return runAction("Failed to save rankings", async ({ db, userId }) => {
    if (
      !Number.isInteger(year) ||
      !Array.isArray(rankedBooks) ||
      !Array.isArray(unreadBooks)
    ) {
      throw new UserError("Invalid rankings");
    }
    await requireMember(
      db,
      bookClubId,
      userId,
      "You must be a member to save rankings"
    );

    const validation = validateYearRankings(
      rankedBooks,
      unreadBooks,
      await rankings.getYearBookIds(db, bookClubId, year)
    );
    if (!validation.ok) throw new UserError(validation.error);

    // One transaction.
    const { error } = await db.rpc("save_year_rankings", {
      p_user_id: userId,
      p_book_club_id: bookClubId,
      p_year: year,
      p_ranked: rankedBooks.map((rb) => ({
        book_id: rb.bookId,
        rank: rb.rank,
      })),
      p_unread: unreadBooks,
    });
    throwIfDbError(error);

    revalidatePath(`/book-clubs/${bookClubId}/rankings`);
  });
}
