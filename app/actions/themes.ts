"use server";

import { revalidatePath } from "next/cache";
import { UserError } from "@/lib/user-error";
import { runAction, type ActionResult } from "@/server/action";
import { requireMember } from "@/server/authz";
import type { Db } from "@/server/db";
import * as themes from "@/server/themes";

async function getThemeClubId(db: Db, themeId: string): Promise<string> {
  const { data, error } = await db
    .from("themes")
    .select("book_club_id")
    .eq("id", themeId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.book_club_id) throw new UserError("Theme not found");
  return data.book_club_id;
}

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
    const bookClubId = await getThemeClubId(db, themeId);
    await requireMember(
      db,
      bookClubId,
      userId,
      "You must be a member to vote on themes"
    );

    const { data: existing, error } = await db
      .from("theme_votes")
      .select("id")
      .eq("theme_id", themeId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;

    const { error: writeError } = existing
      ? await db.from("theme_votes").delete().eq("id", existing.id)
      : await db
          .from("theme_votes")
          .insert({ theme_id: themeId, user_id: userId });
    if (writeError) throw writeError;

    revalidatePath(`/book-clubs/${bookClubId}/themes`);
    return { upvoted: !existing };
  });
}

/** Delete an unused theme (its submitter or a club admin only). */
export async function deleteTheme(themeId: string): Promise<ActionResult> {
  return runAction("Failed to delete theme", async ({ db, userId }) => {
    const { data: theme, error } = await db
      .from("themes")
      .select("book_club_id, submitted_by, meetings (id)")
      .eq("id", themeId)
      .maybeSingle();
    if (error) throw error;
    if (!theme?.book_club_id) throw new UserError("Theme not found");

    const membership = await requireMember(
      db,
      theme.book_club_id,
      userId,
      "You must be a member to delete themes"
    );
    if (theme.submitted_by !== userId && !membership.isAdmin) {
      throw new UserError(
        "You can only delete themes you submitted or be an admin"
      );
    }
    if (theme.meetings.length > 0) {
      throw new UserError("Cannot delete theme that has been used in meetings");
    }

    // Votes cascade.
    const { error: deleteError } = await db
      .from("themes")
      .delete()
      .eq("id", themeId);
    if (deleteError) throw deleteError;

    revalidatePath(`/book-clubs/${theme.book_club_id}/themes`);
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
