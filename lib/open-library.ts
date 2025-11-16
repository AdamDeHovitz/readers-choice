/**
 * Open Library API integration
 * Docs: https://openlibrary.org/dev/docs/api
 */

export interface OpenLibrarySearchDoc {
  key: string; // work ID like "/works/OL45804W"
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number; // cover image ID
  isbn?: string[];
  number_of_pages_median?: number;
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

/**
 * Search for books using Open Library API
 * Returns work-level results (one per book, not per edition)
 */
export async function searchBooks(
  query: string
): Promise<BookSearchResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: "10",
      fields: "key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median",
    });

    const response = await fetch(`${OPEN_LIBRARY_API}/search.json?${params}`);

    if (!response.ok) {
      throw new Error(`Open Library API error: ${response.statusText}`);
    }

    const data: OpenLibrarySearchResponse = await response.json();

    if (!data.docs || data.docs.length === 0) {
      return [];
    }

    // Format results without fetching detailed work info for performance
    // Details will be fetched when a book is selected
    return data.docs.map((doc) => formatOpenLibraryWork(doc));
  } catch (error) {
    console.error("Error searching Open Library:", error);
    return [];
  }
}

/**
 * Get detailed work information including description
 */
async function getWorkDetails(
  workId: string
): Promise<OpenLibraryWork | null> {
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
  edition?: OpenLibraryEdition | null
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
      description = work.description;
    } else if (work.description.value) {
      description = work.description.value;
    }
  }

  // Get ISBN from doc or edition
  const isbn = doc.isbn?.[0] || edition?.isbn_13?.[0] || edition?.isbn_10?.[0];

  // Get page count (from edition, then from search median)
  const pageCount = edition?.number_of_pages || doc.number_of_pages_median;

  // Get published year
  const publishedYear = doc.first_publish_year;

  return {
    id: workId,
    title: doc.title,
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
