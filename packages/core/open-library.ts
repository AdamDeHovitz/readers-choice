/**
 * Open Library API integration
 * Docs: https://openlibrary.org/dev/docs/api
 */

import { cachedInit } from "./cached-fetch";
import { normalizeApiText } from "./normalize-text";

interface OpenLibrarySearchDoc {
  key: string; // work ID like "/works/OL45804W"
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number; // cover image ID
  isbn?: string[];
  number_of_pages_median?: number;
  edition_count?: number;
  /** The edition that best matched the query (e.g. an English translation). */
  editions?: {
    docs: Array<{ title: string }>;
  };
}

interface OpenLibraryWork {
  key: string;
  title: string;
  description?: string | { type: string; value: string };
}

export interface BookSearchResult {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  publishedYear?: number;
  pageCount?: number;
  isbn?: string;
  externalId: string;
  externalSource: "open_library";
}

const OPEN_LIBRARY_API = "https://openlibrary.org";
const OPEN_LIBRARY_COVERS = "https://covers.openlibrary.org/b/id";
const SEARCH_FIELDS =
  "key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median,edition_count,editions,editions.title";
const MAX_RESULTS = 5;

/** One /search.json request; returns [] on any failure so search fails soft. */
async function fetchSearch(
  q: string,
  limit: number
): Promise<OpenLibrarySearchDoc[]> {
  const params = new URLSearchParams({
    q,
    limit: String(limit),
    fields: SEARCH_FIELDS,
  });
  try {
    const response = await fetch(
      `${OPEN_LIBRARY_API}/search.json?${params}`,
      cachedInit({
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 3600 },
      })
    );
    if (!response.ok) return [];
    const data: { docs?: OpenLibrarySearchDoc[] } = await response.json();
    return data.docs ?? [];
  } catch {
    return [];
  }
}

/** Lowercase, strip accents and punctuation, and drop a leading article. */
function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/^(the|a|an) /, "");
}

/** How well a title matches: 3 exact, 2 prefix, 1 has every word, 0 none. */
function titleMatch(title: string, query: string): number {
  const t = normalize(title);
  if (t === query) return 3;
  if (t.startsWith(`${query} `)) return 2;
  const words = new Set(t.split(" "));
  return query.split(" ").every((w) => words.has(w)) ? 1 : 0;
}

/** Whether two words look like forms of one word ("disappearers", "disappearance"). */
function related(a: string, b: string): boolean {
  return (
    a.startsWith(b) ||
    b.startsWith(a) ||
    (a.length >= 5 && a.slice(0, 5) === b.slice(0, 5))
  );
}

/** Whether no query word appears, in any form, in any of the titles. */
function unrelated(titles: string[], query: string): boolean {
  const words = titles.flatMap((t) => normalize(t).split(" "));
  return query.split(" ").every((q) => !words.some((w) => related(q, w)));
}

/**
 * The part of the query that should match this work's title: the normalized
 * query minus words from its author names, so "dune frank herbert" matches
 * "Dune" by Frank Herbert.
 */
function titleQueryFor(doc: OpenLibrarySearchDoc, query: string): string {
  const authorWords = new Set(
    normalize((doc.author_name ?? []).join(" ")).split(" ")
  );
  const kept = query.split(" ").filter((w) => !authorWords.has(w));
  return kept.length > 0 ? kept.join(" ") : query;
}

/**
 * Search for books; returns up to five works (one per book, not per edition).
 *
 * Two queries run in parallel:
 * - `q=` uses Open Library's relevance over titles, authors and edition
 *   titles, which finds title + author queries and translated works.
 * - `title_suggest:"…"` matches title words exactly. Open Library stems `q=`
 *   ("disappearers" → "disappear"), which buries exact titles under popular
 *   near-matches; this query finds them.
 *
 * Results rank by how well the title (or matched edition title) matches,
 * ignoring author words in the query; ties go to the work with more editions.
 * Works with no title match keep Open Library's order, after the matches.
 *
 * One exception: when the general search's top result shares no words with
 * the query, Open Library matched it on a title it doesn't return to us
 * ("1984" for "Nineteen Eighty-Four"), or on its author alone. It ranks as an
 * exact match.
 */
export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  const trimmed = query.trim();
  const normalized = normalize(trimmed);
  if (!normalized) return [];

  const phrase = trimmed.replace(/["\\]/g, " ");
  const [exact, general] = await Promise.all([
    fetchSearch(`title_suggest:"${phrase}"`, 10),
    fetchSearch(trimmed, 20),
  ]);

  const topGeneralKey = general[0]?.key;
  const seen = new Set<string>();
  const ranked = [...exact, ...general]
    .filter((doc) => !seen.has(doc.key) && seen.add(doc.key))
    .map((doc, order) => {
      const titleQuery = titleQueryFor(doc, normalized);
      let best = { match: titleMatch(doc.title, titleQuery), title: doc.title };
      const editionTitles = (doc.editions?.docs ?? []).map((e) => e.title);
      for (const title of editionTitles) {
        const match = titleMatch(title, titleQuery);
        if (match > best.match) best = { match, title };
      }
      if (
        doc.key === topGeneralKey &&
        best.match === 0 &&
        unrelated([doc.title, ...editionTitles], titleQuery)
      ) {
        best.match = 3;
      }
      return { doc, order, ...best };
    });

  ranked.sort(
    (a, b) =>
      b.match - a.match ||
      (a.match > 0
        ? (b.doc.edition_count ?? 0) - (a.doc.edition_count ?? 0)
        : a.order - b.order)
  );

  return ranked
    .slice(0, MAX_RESULTS)
    .map(({ doc, title }) => formatOpenLibraryWork(doc, title));
}

/**
 * Get detailed work information including description
 */
async function getWorkDetails(workId: string): Promise<OpenLibraryWork | null> {
  try {
    const response = await fetch(
      `${OPEN_LIBRARY_API}/works/${encodeURIComponent(workId)}.json`
    );

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
 * Work descriptions can be a string or an object with a value property
 */
function extractDescription(work: OpenLibraryWork): string | undefined {
  const raw =
    typeof work.description === "string"
      ? work.description
      : work.description?.value;
  return normalizeApiText(raw) || undefined;
}

/**
 * Fetch a work's description directly from Open Library
 */
export async function getWorkDescription(
  workId: string
): Promise<string | undefined> {
  const work = await getWorkDetails(workId);
  return work ? extractDescription(work) : undefined;
}

/** Convert a search result into our internal format. */
function formatOpenLibraryWork(
  doc: OpenLibrarySearchDoc,
  title: string
): BookSearchResult {
  // "/works/OL45804W" -> "OL45804W"
  const workId = doc.key.replace("/works/", "");

  return {
    id: workId,
    // May be an English edition title for translated works.
    title,
    author: doc.author_name?.join(", ") || "Unknown Author",
    coverUrl: doc.cover_i
      ? `${OPEN_LIBRARY_COVERS}/${doc.cover_i}-M.jpg`
      : undefined,
    publishedYear: doc.first_publish_year,
    pageCount: doc.number_of_pages_median,
    isbn: doc.isbn?.[0],
    externalId: workId,
    externalSource: "open_library",
  };
}
