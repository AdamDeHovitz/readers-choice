"use server";

import { auth } from "@/auth";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  searchBooks as searchOpenLibrary,
  getWorkDescription,
} from "@/lib/open-library";
import { enrichBookDescription } from "@/lib/enrichment";
import type { BookSearchResult } from "@/lib/open-library";

/**
 * Search for books using Open Library API
 * Returns work-level results (no duplicate editions)
 */
export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  return searchOpenLibrary(query.trim());
}

const OPEN_LIBRARY_WORK_ID = /^OL\d+W$/;
const OPEN_LIBRARY_COVER_URL =
  /^https:\/\/covers\.openlibrary\.org\/b\/id\/\d+-[SML]\.jpg$/;

/**
 * Add a book to our database (if it doesn't exist already)
 *
 * Book rows are shared across clubs, so client-supplied fields are not trusted
 * blindly: the work ID and cover URL must look like Open Library's, and the
 * description is always fetched server-side (Open Library, then Google Books).
 */
export async function addBookToDatabase(book: BookSearchResult) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (
    book.externalSource !== "open_library" ||
    !OPEN_LIBRARY_WORK_ID.test(book.externalId)
  ) {
    return { error: "Invalid book" };
  }

  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if book already exists
    const { data: existing } = await supabase
      .from("books")
      .select("id")
      .eq("external_id", book.externalId)
      .eq("external_source", book.externalSource)
      .single();

    if (existing) {
      return { success: true, bookId: existing.id };
    }

    const description =
      (await getWorkDescription(book.externalId)) ??
      (await enrichBookDescription(book)) ??
      undefined;
    const coverUrl =
      book.coverUrl && OPEN_LIBRARY_COVER_URL.test(book.coverUrl)
        ? book.coverUrl
        : null;

    // Insert new book
    const { data, error } = await supabase
      .from("books")
      .insert({
        title: book.title,
        author: book.author,
        isbn: book.isbn || null,
        cover_url: coverUrl,
        description: description || null,
        published_year: book.publishedYear || null,
        page_count: book.pageCount || null,
        external_id: book.externalId,
        external_source: book.externalSource,
      })
      .select("id")
      .single();

    if (error) throw error;

    return { success: true, bookId: data.id };
  } catch (error) {
    console.error("Error adding book to database:", error);
    return { error: "Failed to add book to database" };
  }
}
