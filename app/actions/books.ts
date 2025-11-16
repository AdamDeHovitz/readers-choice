"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { searchBooks as searchOpenLibrary } from "@/lib/open-library";
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

/**
 * Add a book to our database (if it doesn't exist already)
 * Enriches description from Google Books if missing from Open Library
 */
export async function addBookToDatabase(book: BookSearchResult) {
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

    // Enrich description from Google Books if missing
    let description = book.description;
    if (!description) {
      description = await enrichBookDescription(book) || undefined;
    }

    // Insert new book (always with external_source: "open_library")
    const { data, error } = await supabase
      .from("books")
      .insert({
        title: book.title,
        author: book.author,
        isbn: book.isbn || null,
        cover_url: book.coverUrl || null,
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
