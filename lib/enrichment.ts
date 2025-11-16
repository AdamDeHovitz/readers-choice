/**
 * Book enrichment service
 * Uses Google Books API to fill in missing data (primarily descriptions)
 * from Open Library books
 */

import { searchBooks as searchGoogleBooks, getBookById as getGoogleBook } from "./google-books";
import type { BookSearchResult } from "./open-library";

/**
 * Attempt to enrich a book's description using Google Books
 * Searches by ISBN first, then falls back to title + author
 */
export async function enrichBookDescription(
  book: BookSearchResult
): Promise<string | null> {
  try {
    // If we have an ISBN, try that first (most accurate)
    if (book.isbn) {
      const googleBook = await searchGoogleBooksByISBN(book.isbn);
      if (googleBook?.description) {
        console.log(`Enriched "${book.title}" description via ISBN from Google Books`);
        return googleBook.description;
      }
    }

    // Fallback: search by title and author
    const googleBook = await searchGoogleBooksByTitleAuthor(
      book.title,
      book.author
    );
    if (googleBook?.description) {
      console.log(`Enriched "${book.title}" description via title+author from Google Books`);
      return googleBook.description;
    }

    console.log(`No description found in Google Books for "${book.title}"`);
    return null;
  } catch (error) {
    console.error(`Error enriching book "${book.title}":`, error);
    return null;
  }
}

/**
 * Search Google Books by ISBN
 */
async function searchGoogleBooksByISBN(
  isbn: string
): Promise<{ description?: string } | null> {
  try {
    const results = await searchGoogleBooks(`isbn:${isbn}`);
    return results[0] || null;
  } catch (error) {
    console.error(`Error searching Google Books by ISBN ${isbn}:`, error);
    return null;
  }
}

/**
 * Search Google Books by title and author
 * Tries to find the best match
 */
async function searchGoogleBooksByTitleAuthor(
  title: string,
  author: string
): Promise<{ description?: string } | null> {
  try {
    // Remove common subtitles and noise from title
    const cleanTitle = title
      .split(":")[0] // Remove subtitle
      .split("(")[0] // Remove parenthetical
      .trim();

    // Get first author name (if multiple authors)
    const firstAuthor = author.split(",")[0].trim();

    const query = `intitle:${cleanTitle} inauthor:${firstAuthor}`;
    const results = await searchGoogleBooks(query);

    if (results.length === 0) {
      return null;
    }

    // Find the best match by comparing titles
    const bestMatch = results.find((result) => {
      const resultTitle = result.title.toLowerCase();
      const searchTitle = cleanTitle.toLowerCase();
      return (
        resultTitle.includes(searchTitle) || searchTitle.includes(resultTitle)
      );
    });

    return bestMatch || results[0];
  } catch (error) {
    console.error(
      `Error searching Google Books for "${title}" by ${author}:`,
      error
    );
    return null;
  }
}
