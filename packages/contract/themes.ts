import { z } from "zod";
import { defineContract } from "./operation";
import { rowId } from "./schemas";

export const suggestTheme = defineContract<{ themeId: string }>()({
  name: "themes.suggest",
  kind: "mutation",
  input: z.object({
    bookClubId: rowId,
    name: z.string().trim().min(1, "Theme name is required"),
  }),
});

export const toggleThemeUpvote = defineContract<{ upvoted: boolean }>()({
  name: "themes.toggleUpvote",
  kind: "mutation",
  input: z.object({ themeId: rowId }),
});

export const deleteTheme = defineContract()({
  name: "themes.delete",
  kind: "mutation",
  input: z.object({ themeId: rowId }),
});

/** Theme names for the meeting form's autocomplete. */
export const getThemeSuggestions = defineContract<string[]>()({
  name: "themes.suggestions",
  kind: "query",
  input: z.object({ bookClubId: rowId }),
});
