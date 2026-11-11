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

/** Theme names for the meeting form's autocomplete. */
export const getThemeSuggestions = defineContract({
  name: "themes.suggestions",
  kind: "query",
  input: z.object({ bookClubId: rowId }),
  output: z.array(z.string()),
});
