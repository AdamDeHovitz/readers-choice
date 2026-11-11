import { z } from "zod";
import { defineContract } from "./operation";
import { rowId } from "./schemas";

export const suggestTheme = defineContract({
  name: "themes.suggest",
  kind: "mutation",
  input: z.object({
    bookClubId: rowId,
    name: z.string().trim().min(1, "Theme name is required"),
  }),
  output: z.object({ themeId: rowId }),
});

export const toggleThemeUpvote = defineContract({
  name: "themes.toggleUpvote",
  kind: "mutation",
  input: z.object({ themeId: rowId }),
  output: z.object({ upvoted: z.boolean() }),
});

export const deleteTheme = defineContract({
  name: "themes.delete",
  kind: "mutation",
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
  input: z.object({ bookClubId: rowId }),
  output: z.object({ themes: z.array(clubTheme) }),
});

/** Theme names for the meeting form's autocomplete. */
export const getThemeSuggestions = defineContract({
  name: "themes.suggestions",
  kind: "query",
  input: z.object({ bookClubId: rowId }),
  output: z.array(z.string()),
});
