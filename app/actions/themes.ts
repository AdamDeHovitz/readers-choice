"use server";

import { revalidatePath } from "next/cache";
import { UserError } from "@/lib/user-error";
import { runAction, type ActionResult } from "@/server/action";
import { requireMember } from "@/server/authz";
import * as themes from "@/server/themes";

/** Suggest a theme for future meetings. */
export async function suggestTheme(
  bookClubId: string,
  themeName: string
): Promise<ActionResult<{ themeId: string }>> {
  return runAction("Failed to suggest theme", async ({ db, userId }) => {
    await requireMember(
      db,
      bookClubId,
      userId,
      "You must be a member to suggest themes"
    );
    const themeId = await themes.suggestTheme(
      db,
      bookClubId,
      themeName,
      userId
    );

    revalidatePath(`/book-clubs/${bookClubId}/themes`);
    return { themeId };
  });
}

/** Toggle the viewer's upvote on a theme. */
export async function toggleThemeUpvote(
  themeId: string
): Promise<ActionResult<{ upvoted: boolean }>> {
  return runAction("Failed to toggle upvote", async ({ db, userId }) => {
    const theme = await themes.getThemeContext(db, themeId);
    await requireMember(
      db,
      theme.bookClubId,
      userId,
      "You must be a member to vote on themes"
    );
    const upvoted = await themes.toggleThemeUpvote(db, themeId, userId);

    revalidatePath(`/book-clubs/${theme.bookClubId}/themes`);
    return { upvoted };
  });
}

/** Delete an unused theme (its submitter or a club admin only). */
export async function deleteTheme(themeId: string): Promise<ActionResult> {
  return runAction("Failed to delete theme", async ({ db, userId }) => {
    const theme = await themes.getThemeContext(db, themeId);
    const membership = await requireMember(
      db,
      theme.bookClubId,
      userId,
      "You must be a member to delete themes"
    );
    if (theme.submittedBy !== userId && !membership.isAdmin) {
      throw new UserError(
        "You can only delete themes you submitted or be an admin"
      );
    }
    await themes.deleteUnusedTheme(db, theme);

    revalidatePath(`/book-clubs/${theme.bookClubId}/themes`);
  });
}

/** Theme names for the meeting form's autocomplete. */
export async function getThemeSuggestions(
  bookClubId: string
): Promise<ActionResult<string[]>> {
  return runAction("Failed to load themes", async ({ db, userId }) => {
    await requireMember(db, bookClubId, userId);
    return themes.getThemeSuggestions(db, bookClubId);
  });
}
