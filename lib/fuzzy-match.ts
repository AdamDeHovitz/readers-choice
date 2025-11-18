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
 * Check if two theme names are fuzzy matches
 * Returns true if they match exactly (case-insensitive) or have a Levenshtein distance <= 3
 * Also checks if one is a substring of the other (for plurals like "Mystery" vs "Mysteries")
 */
export function areThemesFuzzyMatch(theme1: string, theme2: string): boolean {
  const normalized1 = normalizeString(theme1);
  const normalized2 = normalizeString(theme2);

  // Exact match after normalization
  if (normalized1 === normalized2) {
    return true;
  }

  // Check if one is a substring of the other (handles plurals)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    // Make sure the difference is small (e.g., just "s" or "ies")
    const lengthDiff = Math.abs(normalized1.length - normalized2.length);
    if (lengthDiff <= 3) {
      return true;
    }
  }

  // Calculate edit distance
  const distance = levenshteinDistance(normalized1, normalized2);

  // Consider it a match if edit distance is 3 or less
  // This catches typos, plurals, etc.
  return distance <= 3;
}

/**
 * Find a fuzzy match for a theme name from a list of existing themes
 * Returns the matching theme or null if no match found
 */
export function findFuzzyMatch(
  themeName: string,
  existingThemes: { id: string; name: string }[]
): { id: string; name: string } | null {
  for (const existingTheme of existingThemes) {
    if (areThemesFuzzyMatch(themeName, existingTheme.name)) {
      return existingTheme;
    }
  }
  return null;
}
