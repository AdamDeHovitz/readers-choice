import "server-only";
import { keys } from "@readers-choice/contract/keys";
import * as contract from "@readers-choice/contract/themes";
import { themeDeletionBlocker } from "@readers-choice/core/themes";
import { UserError } from "@readers-choice/core/user-error";
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
    const blocker = themeDeletionBlocker(theme, {
      userId: ctx.userId,
      isAdmin: membership.isAdmin,
    });
    if (blocker) throw new UserError(blocker);
    await themes.deleteUnusedTheme(ctx.db, theme);
    ctx.invalidate(keys.clubThemes(theme.bookClubId));
  }
);

export const listThemes = implement(
  contract.listThemes,
  "Failed to load themes",
  async (ctx, { bookClubId }) => {
    const membership = await requireMember(ctx.db, bookClubId, ctx.userId);
    const member = { userId: ctx.userId, isAdmin: membership.isAdmin };
    const list = await themes.getBookClubThemes(ctx, bookClubId);
    return {
      themes: list.map((theme) => ({
        ...theme,
        canDelete:
          themeDeletionBlocker(
            {
              submittedBy: theme.submittedBy?.id ?? null,
              timesUsed: theme.timesUsed,
            },
            member
          ) === null,
      })),
    };
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
