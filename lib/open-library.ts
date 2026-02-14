/**
 * Open Library API integration
 * Docs: https://openlibrary.org/dev/docs/api
 */

import { normalizeApiText } from "./normalize-text";

export interface OpenLibrarySearchDoc {
  key: string; // work ID like "/works/OL45804W"
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number; // cover image ID
  isbn?: string[];
  number_of_pages_median?: number;
  edition_count?: number;
  editions?: {
    docs: Array<{ title: string; language?: string[] }>;
  };
}

export interface OpenLibrarySearchResponse {
  num_found: number;
  start: number;
  docs: OpenLibrarySearchDoc[];
}

export interface OpenLibraryWork {
  key: string;
  title: string;
  description?: string | { type: string; value: string };
  covers?: number[];
  authors?: Array<{ author: { key: string } }>;
  first_publish_date?: string;
}

export interface OpenLibraryEdition {
  key: string;
  number_of_pages?: number;
  isbn_13?: string[];
  isbn_10?: string[];
  publish_date?: string;
}

export interface BookSearchResult {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  description?: string;
  publishedYear?: number;
  pageCount?: number;
  isbn?: string;
  externalId: string;
  externalSource: "open_library";
}

const OPEN_LIBRARY_API = "https://openlibrary.org";
const OPEN_LIBRARY_COVERS = "https://covers.openlibrary.org/b/id";

// Common words to skip when matching query to results
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "of",
  "and",
  "or",
  "in",
  "on",
  "at",
  "to",
  "for",
  "by",
  "is",
]);

/**
 * Extract significant words from a query (skip common words)
 */
function getSignificantWords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Check if a search result matches the query (title or edition title contains significant words)
 */
function resultMatchesQuery(
  doc: OpenLibrarySearchDoc,
  significantWords: string[]
): boolean {
  if (significantWords.length === 0) return true;

  const titleLower = doc.title.toLowerCase();
  const editionTitle = doc.editions?.docs?.[0]?.title?.toLowerCase() || "";

  // Require at least half of significant words to match
  const matchCount = significantWords.filter(
    (w) => titleLower.includes(w) || editionTitle.includes(w)
  ).length;

  return matchCount >= Math.ceil(significantWords.length / 2);
}

/**
 * Get the best display title (prefer English edition title if it matches query better)
 */
function getBestTitle(doc: OpenLibrarySearchDoc, query: string): string {
  const editionTitle = doc.editions?.docs?.[0]?.title;
  if (!editionTitle) return doc.title;

  const queryLower = query.toLowerCase();
  const editionLower = editionTitle.toLowerCase();
  const workLower = doc.title.toLowerCase();

  // Prefer edition title if it contains the query (or vice versa)
  const editionMatches =
    editionLower.includes(queryLower) ||
    queryLower.includes(editionLower.split(":")[0].trim());
  const workMatches =
    workLower.includes(queryLower) || queryLower.includes(workLower);

  if (editionMatches && !workMatches) return editionTitle;
  return doc.title;
}

/**
 * Score a search result for ranking (higher = better match)
 */
function scoreResult(doc: OpenLibrarySearchDoc, query: string): number {
  const displayTitle = getBestTitle(doc, query).toLowerCase();
  const queryLower = query.toLowerCase().trim();

  let titleScore = 0;
  if (displayTitle === queryLower) {
    titleScore = 1;
  } else if (displayTitle.startsWith(queryLower)) {
    titleScore = 0.95;
  } else if (displayTitle.includes(queryLower)) {
    titleScore = 0.85;
  } else {
    const words = getSignificantWords(query);
    const matches = words.filter((w) => displayTitle.includes(w)).length;
    titleScore = words.length > 0 ? (matches / words.length) * 0.7 : 0;
  }

  const popularityScore = Math.min(
    Math.log10((doc.edition_count || 1) + 1) / 2,
    1
  );
  return titleScore * 0.7 + popularityScore * 0.3;
}

/**
 * Fetch results using title= search (for direct title matches)
 */
async function fetchTitleSearch(
  query: string
): Promise<OpenLibrarySearchDoc[]> {
  const params = new URLSearchParams({
    title: query,
    limit: "10",
    fields:
      "key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median,edition_count",
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${OPEN_LIBRARY_API}/search.json?${params}`, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return [];
    }

    const data: OpenLibrarySearchResponse = await response.json();
    return data.docs || [];
  } catch {
    clearTimeout(timeoutId);
    return [];
  }
}

/**
 * Fetch results using q= search with editions (for translated titles)
 */
async function fetchQSearch(query: string): Promise<OpenLibrarySearchDoc[]> {
  const params = new URLSearchParams({
    q: query,
    limit: "15",
    fields:
      "key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median,edition_count,editions,editions.title,editions.language",
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${OPEN_LIBRARY_API}/search.json?${params}`, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return [];
    }

    const data: OpenLibrarySearchResponse = await response.json();
    return data.docs || [];
  } catch {
    clearTimeout(timeoutId);
    return [];
  }
}

/**
 * Search for books using Open Library API
 * Returns work-level results (one per book, not per edition)
 *
 * Uses parallel search strategy:
 * - title= search finds direct title matches
 * - q= search finds translated works via edition titles
 * Results are merged, deduplicated, scored, and ranked
 */
export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  try {
    if (!query.trim()) {
      return [];
    }

    const significantWords = getSignificantWords(query);

    // Run both searches in parallel (no added latency vs single search)
    const [titleResults, qResults] = await Promise.all([
      fetchTitleSearch(query),
      fetchQSearch(query),
    ]);

    // Filter q= results to only keep relevant matches
    const filteredQResults = qResults.filter((doc) =>
      resultMatchesQuery(doc, significantWords)
    );

    // Merge and deduplicate by work ID
    const seenIds = new Set<string>();
    const allResults: OpenLibrarySearchDoc[] = [];

    for (const doc of [...titleResults, ...filteredQResults]) {
      const workId = doc.key.replace("/works/", "");
      if (!seenIds.has(workId)) {
        seenIds.add(workId);
        allResults.push(doc);
      }
    }

    // Score, sort, and return top 5
    const scored = allResults.map((doc) => ({
      doc,
      score: scoreResult(doc, query),
    }));
    scored.sort((a, b) => b.score - a.score);

    return scored
      .slice(0, 5)
      .map(({ doc }) =>
        formatOpenLibraryWork(doc, undefined, undefined, query)
      );
  } catch (error) {
    console.error("Error searching Open Library:", error);
    return [];
  }
}

/**
 * Get detailed work information including description
 */
async function getWorkDetails(workId: string): Promise<OpenLibraryWork | null> {
  try {
    const response = await fetch(`${OPEN_LIBRARY_API}/works/${workId}.json`);

    if (!response.ok) {
      return null;
    }

    const data: OpenLibraryWork = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching work details for ${workId}:`, error);
    return null;
  }
}

/**
 * Get a single book by Open Library work ID
 */
export async function getBookById(
  workId: string
): Promise<BookSearchResult | null> {
  try {
    const work = await getWorkDetails(workId);
    if (!work) return null;

    // Get first edition for additional metadata like page count
    const editionsResponse = await fetch(
      `${OPEN_LIBRARY_API}/works/${workId}/editions.json?limit=1`
    );

    let edition: OpenLibraryEdition | null = null;
    if (editionsResponse.ok) {
      const editionsData = await editionsResponse.json();
      edition = editionsData.entries?.[0] || null;
    }

    // Create a search doc from the work data
    const searchDoc: OpenLibrarySearchDoc = {
      key: work.key,
      title: work.title,
      cover_i: work.covers?.[0],
      first_publish_year: work.first_publish_date
        ? parseInt(work.first_publish_date.split("-")[0])
        : undefined,
    };

    return formatOpenLibraryWork(searchDoc, work, edition);
  } catch (error) {
    console.error("Error fetching Open Library book:", error);
    return null;
  }
}

/**
 * Format Open Library response into our internal format
 */
function formatOpenLibraryWork(
  doc: OpenLibrarySearchDoc,
  work?: OpenLibraryWork | null,
  edition?: OpenLibraryEdition | null,
  query?: string
): BookSearchResult {
  // Extract work ID from key (e.g., "/works/OL45804W" -> "OL45804W")
  const workId = doc.key.replace("/works/", "");

  // Get author name
  const author = doc.author_name?.join(", ") || "Unknown Author";

  // Get cover URL
  const coverUrl = doc.cover_i
    ? `${OPEN_LIBRARY_COVERS}/${doc.cover_i}-M.jpg`
    : undefined;

  // Get description (can be string or object with value property)
  let description: string | undefined;
  if (work?.description) {
    if (typeof work.description === "string") {
      description = normalizeApiText(work.description) || undefined;
    } else if (work.description.value) {
      description = normalizeApiText(work.description.value) || undefined;
    }
  }

  // Get ISBN from doc or edition
  const isbn = doc.isbn?.[0] || edition?.isbn_13?.[0] || edition?.isbn_10?.[0];

  // Get page count (from edition, then from search median)
  const pageCount = edition?.number_of_pages || doc.number_of_pages_median;

  // Get published year
  const publishedYear = doc.first_publish_year;

  // Use best title (may prefer English edition title for translated works)
  const title = query ? getBestTitle(doc, query) : doc.title;

  return {
    id: workId,
    title,
    author,
    coverUrl,
    description,
    publishedYear,
    pageCount,
    isbn,
    externalId: workId,
    externalSource: "open_library",
  };
}

/**
 * Search Open Library by ISBN
 * Used for enrichment and migration purposes
 */
export async function searchByISBN(
  isbn: string
): Promise<BookSearchResult | null> {
  try {
    const response = await fetch(`${OPEN_LIBRARY_API}/isbn/${isbn}.json`);

    if (!response.ok) {
      return null;
    }

    const edition: OpenLibraryEdition = await response.json();

    // Get the work ID from the edition
    const workKey = (edition as any).works?.[0]?.key;
    if (!workKey) {
      return null;
    }

    const workId = workKey.replace("/works/", "");
    return getBookById(workId);
  } catch (error) {
    console.error(`Error searching Open Library by ISBN ${isbn}:`, error);
    return null;
  }
}
