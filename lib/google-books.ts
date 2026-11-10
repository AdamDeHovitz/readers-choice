/**
 * Google Books, used only as a fallback source of book descriptions when
 * Open Library has none. Docs: https://developers.google.com/books/docs/v1/using
 */

import { normalizeApiHtml } from "./normalize-text";

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";

interface Volume {
  title: string;
  description?: string;
}

/** Search volumes; returns [] on any failure so callers can fall through. */
export async function searchVolumes(query: string): Promise<Volume[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      maxResults: "10",
      printType: "books",
      langRestrict: "en",
    });
    const response = await fetch(`${GOOGLE_BOOKS_API}?${params}`);
    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.statusText}`);
    }

    const data: {
      items?: { volumeInfo: { title: string; description?: string } }[];
    } = await response.json();

    return (data.items ?? []).map(({ volumeInfo }) => ({
      title: volumeInfo.title,
      description: normalizeApiHtml(volumeInfo.description) || undefined,
    }));
  } catch (error) {
    console.error("Error searching Google Books:", error);
    return [];
  }
}

/**
 * Find a description for a book: by ISBN first (most accurate), then by
 * title and first author, preferring a result whose title matches.
 */
export async function findGoogleBooksDescription(book: {
  title: string;
  author: string;
  isbn?: string;
}): Promise<string | null> {
  if (book.isbn) {
    const [byIsbn] = await searchVolumes(`isbn:${book.isbn}`);
    if (byIsbn?.description) return byIsbn.description;
  }

  // Drop subtitles, parentheticals and extra authors; they hurt matching.
  const title = book.title.split(":")[0].split("(")[0].trim();
  const author = book.author.split(",")[0].trim();
  const results = await searchVolumes(`intitle:${title} inauthor:${author}`);

  const wanted = title.toLowerCase();
  const match =
    results.find((r) => {
      const found = r.title.toLowerCase();
      return found.includes(wanted) || wanted.includes(found);
    }) ?? results[0];
  return match?.description ?? null;
}
