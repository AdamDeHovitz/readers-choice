/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits required to change one word into the other
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }

  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Normalize a string for comparison
 * - Convert to lowercase
 * - Trim whitespace
 * - Remove extra spaces
 */
function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * True when `plural` is a regular English plural of `singular`
 * ("mystery" -> "mysteries", "novel" -> "novels", "class" -> "classes").
 * Applied to the whole string, so "ghost story" -> "ghost stories" also works.
 */
function isPluralOf(plural: string, singular: string): boolean {
  if (plural === `${singular}s` || plural === `${singular}es`) return true;
  return singular.endsWith("y") && plural === `${singular.slice(0, -1)}ies`;
}

/**
 * Maximum edit distance tolerated for a name of the given length.
 * Short words get no slack (otherwise "Love" ~ "Loss", "Art" ~ "War");
 * longer names tolerate proportionally more typos.
 */
function maxTypoDistance(length: number): number {
  if (length <= 4) return 0;
  if (length <= 7) return 1;
  if (length <= 11) return 2;
  return 3;
}

/**
 * Check if two theme names are fuzzy matches
 * Matches when they are equal ignoring case and whitespace, when one is a
 * regular plural of the other ("Mystery" vs "Mysteries"), or when the edit
 * distance is within a typo budget that scales with the shorter name's length.
 */
export function areThemesFuzzyMatch(theme1: string, theme2: string): boolean {
  const normalized1 = normalizeString(theme1);
  const normalized2 = normalizeString(theme2);

  if (normalized1 === normalized2) {
    return true;
  }

  if (
    isPluralOf(normalized1, normalized2) ||
    isPluralOf(normalized2, normalized1)
  ) {
    return true;
  }

  const shorterLength = Math.min(normalized1.length, normalized2.length);
  const allowed = maxTypoDistance(shorterLength);
  if (allowed === 0) {
    return false;
  }

  return levenshteinDistance(normalized1, normalized2) <= allowed;
}

/**
 * Find a fuzzy match for a theme name from a list of existing themes
 * Returns the matching theme or null if no match found.
 * An exact (case/whitespace-insensitive) match wins over a fuzzy one.
 */
export function findFuzzyMatch(
  themeName: string,
  existingThemes: { id: string; name: string }[]
): { id: string; name: string } | null {
  const normalized = normalizeString(themeName);
  const exact = existingThemes.find(
    (theme) => normalizeString(theme.name) === normalized
  );
  if (exact) {
    return exact;
  }

  for (const existingTheme of existingThemes) {
    if (areThemesFuzzyMatch(themeName, existingTheme.name)) {
      return existingTheme;
    }
  }
  return null;
}
