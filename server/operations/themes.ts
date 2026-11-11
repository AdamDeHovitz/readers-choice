import "server-only";
import { keys } from "@/contract/keys";
import * as contract from "@/contract/themes";
import { UserError } from "@/lib/user-error";
import { requireMember } from "../authz";
import { implement } from "../operation";
import * as themes from "../themes";

export const suggestTheme = implement(
  contract.suggestTheme,
  "Failed to suggest theme",
  async (ctx, { bookClubId, name }) => {
    await requireMember(
      ctx.db,
      bookClubId,
      ctx.userId,
      "You must be a member to suggest themes"
    );
    const themeId = await themes.suggestTheme(
      ctx.db,
      bookClubId,
      name,
      ctx.userId
    );
    ctx.invalidate(keys.clubThemes(bookClubId));
    return { themeId };
  }
);

export const toggleThemeUpvote = implement(
  contract.toggleThemeUpvote,
  "Failed to toggle upvote",
  async (ctx, { themeId }) => {
    const theme = await themes.getThemeContext(ctx.db, themeId);
    await requireMember(
      ctx.db,
      theme.bookClubId,
      ctx.userId,
      "You must be a member to vote on themes"
    );
    const upvoted = await themes.toggleThemeUpvote(ctx.db, themeId, ctx.userId);
    ctx.invalidate(keys.clubThemes(theme.bookClubId));
    return { upvoted };
  }
);

/** Delete an unused theme (its submitter or a club admin only). */
export const deleteTheme = implement(
  contract.deleteTheme,
  "Failed to delete theme",
  async (ctx, { themeId }) => {
    const theme = await themes.getThemeContext(ctx.db, themeId);
    const membership = await requireMember(
      ctx.db,
      theme.bookClubId,
      ctx.userId,
      "You must be a member to delete themes"
    );
    if (theme.submittedBy !== ctx.userId && !membership.isAdmin) {
      throw new UserError(
        "You can only delete themes you submitted or be an admin"
      );
    }
    await themes.deleteUnusedTheme(ctx.db, theme);
    ctx.invalidate(keys.clubThemes(theme.bookClubId));
  }
);

export const getThemeSuggestions = implement(
  contract.getThemeSuggestions,
  "Failed to load themes",
  async (ctx, { bookClubId }) => {
    await requireMember(ctx.db, bookClubId, ctx.userId);
    return themes.getThemeSuggestions(ctx.db, bookClubId);
  }
);
