/**
 * Script to update existing books with complete metadata from Google Books API
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
config({ path: ".env.local" });

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";

interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    publishedDate?: string;
    pageCount?: number;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

async function fetchGoogleBookData(googleBooksId: string): Promise<GoogleBook | null> {
  try {
    const response = await fetch(`${GOOGLE_BOOKS_API}/${googleBooksId}`);
    if (!response.ok) {
      console.error(`Failed to fetch book ${googleBooksId}: ${response.statusText}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching book ${googleBooksId}:`, error);
    return null;
  }
}

async function updateBookMetadata() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Fetch all books with Google Books external IDs
  const { data: books, error: fetchError } = await supabase
    .from("books")
    .select("id, title, external_id, external_source, description, page_count")
    .eq("external_source", "google_books");

  if (fetchError) {
    console.error("Error fetching books:", fetchError);
    process.exit(1);
  }

  if (!books || books.length === 0) {
    console.log("No books found to update");
    return;
  }

  console.log(`Found ${books.length} books to update`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const book of books) {
    // Skip if already has description and page_count
    if (book.description && book.page_count) {
      console.log(`Skipping "${book.title}" - already has complete data`);
      skipped++;
      continue;
    }

    console.log(`Updating "${book.title}"...`);

    const googleData = await fetchGoogleBookData(book.external_id);

    if (!googleData) {
      console.error(`Failed to fetch data for "${book.title}"`);
      failed++;
      continue;
    }

    const { volumeInfo } = googleData;

    // Update the book with new data
    const { error: updateError } = await supabase
      .from("books")
      .update({
        description: volumeInfo.description || book.description,
        page_count: volumeInfo.pageCount || book.page_count,
        // Also update cover_url if it's missing
        cover_url: volumeInfo.imageLinks?.thumbnail?.replace("http://", "https://") ||
                   volumeInfo.imageLinks?.smallThumbnail?.replace("http://", "https://") ||
                   null,
      })
      .eq("id", book.id);

    if (updateError) {
      console.error(`Error updating "${book.title}":`, updateError);
      failed++;
      continue;
    }

    console.log(`✓ Updated "${book.title}"`);
    updated++;

    // Rate limit: wait 100ms between requests to avoid hitting API limits
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log("\n=== Summary ===");
  console.log(`Total books: ${books.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
}

// Run the script
updateBookMetadata()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
