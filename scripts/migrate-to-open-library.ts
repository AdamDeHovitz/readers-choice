/**
 * Migration script to convert Google Books records to Open Library
 *
 * This script:
 * 1. Fetches all books with external_source = 'google_books'
 * 2. For each book, searches Open Library by ISBN or title+author
 * 3. Updates external_id to the Open Library work ID
 * 4. Updates external_source to 'open_library'
 * 5. Preserves existing descriptions and metadata
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { searchByISBN } from "../lib/open-library";

// Load environment variables
config({ path: ".env.local" });

const OPEN_LIBRARY_API = "https://openlibrary.org";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  google_books_id: string;
  external_id: string;
  external_source: string;
  description: string | null;
}

interface OpenLibrarySearchResult {
  key: string; // work ID like "/works/OL45804W"
  title: string;
  author_name?: string[];
}

async function searchOpenLibraryByTitleAuthor(
  title: string,
  author: string
): Promise<string | null> {
  try {
    // Clean title and author for better matching
    const cleanTitle = title.split(":")[0].split("(")[0].trim();
    const firstAuthor = author.split(",")[0].trim();

    const query = `title:${encodeURIComponent(cleanTitle)} author:${encodeURIComponent(firstAuthor)}`;
    const response = await fetch(
      `${OPEN_LIBRARY_API}/search.json?q=${query}&limit=5`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.docs || data.docs.length === 0) {
      return null;
    }

    // Find best match by comparing titles and authors
    const bestMatch = data.docs.find((doc: OpenLibrarySearchResult) => {
      const docTitle = doc.title.toLowerCase();
      const searchTitle = cleanTitle.toLowerCase();
      const docAuthor = doc.author_name?.[0]?.toLowerCase() || "";
      const searchAuthor = firstAuthor.toLowerCase();

      return (
        (docTitle.includes(searchTitle) || searchTitle.includes(docTitle)) &&
        (docAuthor.includes(searchAuthor) || searchAuthor.includes(docAuthor))
      );
    });

    if (bestMatch) {
      return bestMatch.key.replace("/works/", "");
    }

    // If no exact match, return first result
    return data.docs[0].key.replace("/works/", "");
  } catch (error) {
    console.error(`Error searching OL for "${title}" by ${author}:`, error);
    return null;
  }
}

async function migrateBook(
  book: Book,
  supabase: any,
  dryRun: boolean
): Promise<{ success: boolean; workId?: string; error?: string }> {
  console.log(`\nProcessing: "${book.title}" by ${book.author}`);
  console.log(`  Google Books ID: ${book.google_books_id}`);

  let workId: string | null = null;

  // Try ISBN first if available
  if (book.isbn) {
    console.log(`  Searching by ISBN: ${book.isbn}`);
    const result = await searchByISBN(book.isbn);
    if (result) {
      workId = result.externalId;
      console.log(`  ✓ Found via ISBN: ${workId}`);
    }
  }

  // Fallback to title + author search
  if (!workId) {
    console.log(`  Searching by title + author`);
    workId = await searchOpenLibraryByTitleAuthor(book.title, book.author);
    if (workId) {
      console.log(`  ✓ Found via title+author: ${workId}`);
    }
  }

  if (!workId) {
    console.log(`  ✗ Could not find in Open Library`);
    return { success: false, error: "Not found in Open Library" };
  }

  // Update the database
  if (dryRun) {
    console.log(`  [DRY RUN] Would update external_id to: ${workId}`);
    return { success: true, workId };
  }

  const { error } = await supabase
    .from("books")
    .update({
      external_id: workId,
      external_source: "open_library",
    })
    .eq("id", book.id);

  if (error) {
    console.log(`  ✗ Error updating: ${error.message}`);
    return { success: false, error: error.message };
  }

  console.log(`  ✓ Successfully migrated to Open Library`);
  return { success: true, workId };
}

async function runMigration(dryRun: boolean = true) {
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

  console.log("=".repeat(60));
  console.log(dryRun ? "DRY RUN MODE - No changes will be made" : "LIVE MODE - Database will be updated");
  console.log("=".repeat(60));

  // Fetch all Google Books records
  const { data: books, error: fetchError } = await supabase
    .from("books")
    .select("id, title, author, isbn, google_books_id, external_id, external_source, description")
    .eq("external_source", "google_books");

  if (fetchError) {
    console.error("Error fetching books:", fetchError);
    process.exit(1);
  }

  if (!books || books.length === 0) {
    console.log("No Google Books records found to migrate");
    return;
  }

  console.log(`\nFound ${books.length} Google Books records to migrate\n`);

  let successful = 0;
  let failed = 0;
  const failures: Array<{ book: Book; error: string }> = [];

  for (const book of books) {
    const result = await migrateBook(book, supabase, dryRun);

    if (result.success) {
      successful++;
    } else {
      failed++;
      failures.push({ book, error: result.error || "Unknown error" });
    }

    // Rate limit: wait 200ms between requests
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log("\n" + "=".repeat(60));
  console.log("MIGRATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total books: ${books.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);

  if (failures.length > 0) {
    console.log("\nFailed migrations:");
    failures.forEach(({ book, error }) => {
      console.log(`  - "${book.title}" by ${book.author}: ${error}`);
    });
  }

  if (dryRun) {
    console.log("\n⚠️  This was a DRY RUN. No changes were made.");
    console.log("To apply changes, run: node -r dotenv/config node_modules/.bin/tsx scripts/migrate-to-open-library.ts --live");
  } else {
    console.log("\n✓ Migration complete!");
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes("--live");

// Run the migration
runMigration(dryRun)
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
