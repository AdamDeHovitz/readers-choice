"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { searchBooks as searchGoogleBooks } from "@/lib/google-books";
import type { BookSearchResult } from "@/lib/google-books";

/**
 * Search for books using Google Books API
 */
export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  return searchGoogleBooks(query.trim());
}

/**
 * Add a book to our database (if it doesn't exist already)
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

    // Insert new book
    const { data, error } = await supabase
      .from("books")
      .insert({
        title: book.title,
        author: book.author,
        isbn: book.isbn || null,
        cover_url: book.coverUrl || null,
        description: book.description || null,
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
