/**
 * One-time migration script to fix encoding issues in existing book descriptions
 * Run with: npx tsx scripts/fix-book-descriptions.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeApiHtml } from "../lib/normalize-text";

// Load .env.local file
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixBookDescriptions() {
  console.log("Starting book descriptions encoding fix...\n");

  // Get all books with descriptions
  const { data: books, error } = await supabase
    .from("books")
    .select("id, title, description")
    .not("description", "is", null);

  if (error) {
    console.error("Error fetching books:", error);
    process.exit(1);
  }

  if (!books || books.length === 0) {
    console.log("No books with descriptions found.");
    return;
  }

  console.log(`Found ${books.length} books with descriptions\n`);

  let fixed = 0;
  let unchanged = 0;
  let errors = 0;

  for (const book of books) {
    const originalDescription = book.description;
    const normalizedDescription = normalizeApiHtml(originalDescription);

    // Check if the description actually changed
    if (normalizedDescription === originalDescription) {
      unchanged++;
      continue;
    }

    // Check if normalization actually fixed something (look for mojibake patterns)
    const hadEncodingIssue = /â€|Ã©|Ã¨|Ã |â\?{2}|â¿¿/.test(originalDescription);

    if (!hadEncodingIssue) {
      unchanged++;
      continue;
    }

    console.log(`Fixing: ${book.title}`);
    console.log(`  Before: ${originalDescription?.substring(0, 100)}...`);
    console.log(`  After:  ${normalizedDescription?.substring(0, 100)}...\n`);

    // Update the book
    const { error: updateError } = await supabase
      .from("books")
      .update({ description: normalizedDescription })
      .eq("id", book.id);

    if (updateError) {
      console.error(`  Error updating book ${book.id}:`, updateError);
      errors++;
    } else {
      fixed++;
    }
  }

  console.log("\n=== Migration Complete ===");
  console.log(`Total books processed: ${books.length}`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Unchanged: ${unchanged}`);
  console.log(`Errors: ${errors}`);
}

fixBookDescriptions()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
