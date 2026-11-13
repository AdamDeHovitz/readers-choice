/**
 * Why a member can't delete a theme, or null if they can. The delete
 * operation enforces it, and the themes list uses it to show the button
 * only where deleting would succeed.
 */
export function themeDeletionBlocker(
  theme: { submittedBy: string | null; timesUsed: number },
  member: { userId: string; isAdmin: boolean }
): string | null {
  if (theme.submittedBy !== member.userId && !member.isAdmin) {
    return "You can only delete themes you submitted or be an admin";
  }
  if (theme.timesUsed > 0) {
    return "Cannot delete theme that has been used in meetings";
  }
  return null;
}

/** The themes list's filter. Unused themes are the ones still up for grabs. */
export type ThemeFilter = "unused" | "used" | "all";

interface ListedTheme {
  upvoteCount: number;
  timesUsed: number;
  createdAt: string | null;
}

/** The themes a filter shows, most upvoted first, then newest. */
export function themesToShow<T extends ListedTheme>(
  themes: readonly T[],
  filter: ThemeFilter
): T[] {
  return themes
    .filter((theme) =>
      filter === "all"
        ? true
        : filter === "used"
          ? theme.timesUsed > 0
          : theme.timesUsed === 0
    )
    .sort(
      (a, b) =>
        b.upvoteCount - a.upvoteCount ||
        Date.parse(b.createdAt ?? "0") - Date.parse(a.createdAt ?? "0")
    );
}

/** How many themes each filter shows. */
export function countThemes(
  themes: readonly ListedTheme[]
): Record<ThemeFilter, number> {
  const used = themes.filter((theme) => theme.timesUsed > 0).length;
  return { all: themes.length, used, unused: themes.length - used };
}
