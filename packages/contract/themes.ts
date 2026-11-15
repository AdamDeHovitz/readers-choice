import { z } from "zod";
import { keys } from "./keys";
import { defineContract } from "./operation";
import { rowId } from "./schemas";

export const suggestTheme = defineContract({
  name: "themes.suggest",
  kind: "mutation",
  description:
    "Suggest a reading theme for a club (e.g. 'Books set in Japan'). Club members only. Returns the new theme's id.",
  input: z.object({
    bookClubId: rowId,
    name: z.string().trim().min(1, "Theme name is required"),
  }),
  output: z.object({ themeId: rowId }),
});

export const toggleThemeUpvote = defineContract({
  name: "themes.toggleUpvote",
  kind: "mutation",
  description:
    "Upvote a theme, or remove the user's upvote if they already gave one. Club members only. Returns whether the theme is now upvoted.",
  input: z.object({ themeId: rowId }),
  output: z.object({ upvoted: z.boolean() }),
});

export const deleteTheme = defineContract({
  name: "themes.delete",
  kind: "mutation",
  description:
    "Delete a theme no meeting has used. Allowed for whoever suggested it and for club admins.",
  input: z.object({ themeId: rowId }),
  output: z.void(),
});

/** One theme as the themes screen shows it. */
const clubTheme = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().nullable(),
  submittedBy: z
    .object({ id: z.string(), name: z.string(), image: z.string().nullable() })
    .nullable(),
  upvoteCount: z.number().int(),
  userHasUpvoted: z.boolean(),
  timesUsed: z.number().int(),
  meetings: z.array(
    z.object({
      id: z.string(),
      meetingDate: z.string(),
      isFinalized: z.boolean(),
    })
  ),
  /** Whether the viewer may delete it: the same rule deleteTheme enforces. */
  canDelete: z.boolean(),
});
export type ClubTheme = z.output<typeof clubTheme>;

/** The themes screen: every theme in a club, newest first. Members only. */
export const listThemes = defineContract({
  name: "themes.list",
  kind: "query",
  description:
    "List every theme in a club, newest first, with upvotes, who suggested it, the meetings that used it, and whether the user may delete it. Club members only.",
  input: z.object({ bookClubId: rowId }),
  output: z.object({ themes: z.array(clubTheme) }),
  cacheKey: ({ bookClubId }) => keys.clubThemes(bookClubId),
});

/** Theme names for the meeting form's autocomplete. */
export const getThemeSuggestions = defineContract({
  name: "themes.suggestions",
  kind: "query",
  description:
    "List the names of a club's themes, for picking one when planning a meeting. Club members only.",
  input: z.object({ bookClubId: rowId }),
  output: z.array(z.string()),
});
