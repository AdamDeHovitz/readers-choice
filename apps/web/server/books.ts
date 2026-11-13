import "server-only";
import { findGoogleBooksDescription } from "@readers-choice/core/google-books";
import { getWorkDescription, type BookSearchResult } from "@readers-choice/core/open-library";
import { UserError } from "@readers-choice/core/user-error";
import type { Db, Tables } from "./db";

/** A book as the UI sees it. */
export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  description: string | null;
  pageCount: number | null;
  publishedYear: number | null;
}

type BookRow = Pick<
  Tables<"books">,
  | "id"
  | "title"
  | "author"
  | "cover_url"
  | "description"
  | "page_count"
  | "published_year"
>;

export function toBook(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    coverUrl: row.cover_url,
    description: row.description,
    pageCount: row.page_count,
    publishedYear: row.published_year,
  };
}

const OPEN_LIBRARY_WORK_ID = /^OL\d+W$/;
const OPEN_LIBRARY_COVER_URL =
  /^https:\/\/covers\.openlibrary\.org\/b\/id\/\d+-[SML]\.jpg$/;

/**
 * Find or insert a book from a search result and return its id.
 *
 * Book rows are shared across clubs, so client-supplied fields are not trusted
 * blindly: the work ID and cover URL must look like Open Library's, and the
 * description is always fetched server-side (Open Library, then Google Books).
 */
export async function saveBook(
  db: Db,
  book: BookSearchResult
): Promise<string> {
  if (
    book?.externalSource !== "open_library" ||
    !OPEN_LIBRARY_WORK_ID.test(book.externalId)
  ) {
    throw new UserError("Invalid book");
  }

  const { data: existing, error: findError } = await db
    .from("books")
    .select("id")
    .eq("external_id", book.externalId)
    .eq("external_source", book.externalSource)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing.id;

  const description =
    (await getWorkDescription(book.externalId)) ??
    (await findGoogleBooksDescription(book)) ??
    null;
  const coverUrl =
    book.coverUrl && OPEN_LIBRARY_COVER_URL.test(book.coverUrl)
      ? book.coverUrl
      : null;

  const { data, error } = await db
    .from("books")
    .insert({
      title: book.title,
      author: book.author,
      isbn: book.isbn || null,
      cover_url: coverUrl,
      description,
      published_year: book.publishedYear || null,
      page_count: book.pageCount || null,
      external_id: book.externalId,
      external_source: book.externalSource,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
