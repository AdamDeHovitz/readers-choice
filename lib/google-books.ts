/**
 * Google Books API integration
 * Docs: https://developers.google.com/books/docs/v1/using
 */

export interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    publishedDate?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    pageCount?: number;
    categories?: string[];
  };
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
  externalSource: "google_books";
}

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";

/**
 * Search for books using Google Books API
 */
export async function searchBooks(
  query: string
): Promise<BookSearchResult[]> {
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

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map((item: GoogleBook) => formatGoogleBook(item));
  } catch (error) {
    console.error("Error searching books:", error);
    return [];
  }
}

/**
 * Get a single book by Google Books ID
 */
export async function getBookById(
  googleBooksId: string
): Promise<BookSearchResult | null> {
  try {
    const response = await fetch(`${GOOGLE_BOOKS_API}/${googleBooksId}`);

    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.statusText}`);
    }

    const data: GoogleBook = await response.json();
    return formatGoogleBook(data);
  } catch (error) {
    console.error("Error fetching book:", error);
    return null;
  }
}

/**
 * Format a Google Books response into our internal format
 */
function formatGoogleBook(book: GoogleBook): BookSearchResult {
  const { volumeInfo } = book;

  // Get ISBN (prefer ISBN-13 over ISBN-10)
  const isbn13 = volumeInfo.industryIdentifiers?.find(
    (id) => id.type === "ISBN_13"
  )?.identifier;
  const isbn10 = volumeInfo.industryIdentifiers?.find(
    (id) => id.type === "ISBN_10"
  )?.identifier;
  const isbn = isbn13 || isbn10;

  // Get published year
  const publishedYear = volumeInfo.publishedDate
    ? parseInt(volumeInfo.publishedDate.split("-")[0])
    : undefined;

  // Get authors (join multiple authors with comma)
  const author =
    volumeInfo.authors?.join(", ") || "Unknown Author";

  // Get cover image (prefer thumbnail over small thumbnail)
  const coverUrl = volumeInfo.imageLinks?.thumbnail?.replace(
    "http://",
    "https://"
  ) || volumeInfo.imageLinks?.smallThumbnail?.replace(
    "http://",
    "https://"
  );

  return {
    id: book.id,
    title: volumeInfo.title,
    author,
    coverUrl,
    description: volumeInfo.description,
    publishedYear,
    pageCount: volumeInfo.pageCount,
    isbn,
    externalId: book.id,
    externalSource: "google_books",
  };
}
