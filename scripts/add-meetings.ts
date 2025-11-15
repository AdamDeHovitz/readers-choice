/**
 * Script to bulk add past meetings to a book club
 * Run with: npx tsx scripts/add-meetings.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// User ID for Adam DeHovitz
const ADMIN_USER_ID = "02f087ba-2fef-49c9-a15c-2f292b4b8f2e";

interface MeetingData {
  month: string;
  year: number;
  title: string;
  author: string;
  theme: string | null;
}

// Calculate second Tuesday of a given month/year
function getSecondTuesday(year: number, month: number): Date {
  // month is 0-indexed (0 = January, 11 = December)
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday, 2 = Tuesday

  // Find first Tuesday
  let firstTuesday = 1;
  if (firstDayOfWeek <= 2) {
    firstTuesday = 1 + (2 - firstDayOfWeek);
  } else {
    firstTuesday = 1 + (9 - firstDayOfWeek);
  }

  // Second Tuesday is 7 days later
  const secondTuesday = firstTuesday + 7;

  // Set time to 7:00 PM
  return new Date(year, month, secondTuesday, 19, 0, 0);
}

const meetings: MeetingData[] = [
  // 2024 - excluding August, September, November (already added)
  { month: "December", year: 2023, title: "Convenience Store Woman", author: "Sayaka Murata", theme: null },
  { month: "January", year: 2024, title: "Piranesi", author: "Susanna Clarke", theme: null },
  // February 2024 - N/A
  { month: "March", year: 2024, title: "This is How You Lose the Time War", author: "Amal El-Mohtar", theme: null },
  { month: "April", year: 2024, title: "Chain-Gang All Stars", author: "Nana Kwame Adjei-Brenyah", theme: null },
  { month: "May", year: 2024, title: "Death Valley", author: "Melissa Broder", theme: null },
  { month: "June", year: 2024, title: "What is Not Yours is Not Yours", author: "Helen Oyeyemi", theme: "Short story collection" },
  { month: "July", year: 2024, title: "The Maid", author: "Nita Prose", theme: "Mystery" },
  // August 2024 - already added
  // September 2024 - already added
  { month: "October", year: 2024, title: "Frankenstein", author: "Mary Shelley", theme: "Spooky" },
  // November 2024 - already added
  { month: "December", year: 2024, title: "Starter Villain", author: "John Scalzi", theme: "Books you judge by their cover" },

  // 2025
  { month: "January", year: 2025, title: "Crying in H Mart", author: "Michelle Zauner", theme: "Memoirs" },
  { month: "February", year: 2025, title: "The Beach", author: "Alex Garland", theme: "Books written the year you were born" },
  { month: "March", year: 2025, title: "The Yiddish Policeman's Union", author: "Michael Chabon", theme: "Runners up from previous months" },
  { month: "April", year: 2025, title: "The Posthumous Memoirs of Bras Cubas", author: "Machado de Assis", theme: "Books over 100 years old" },
  { month: "May", year: 2025, title: "Babel", author: "R.F. Kuang", theme: "Books that changed your life" },
  { month: "June", year: 2025, title: "Sense and Sensibility", author: "Jane Austen", theme: "Jane Austen" },
  { month: "July", year: 2025, title: "The Thursday Murder Club", author: "Richard Osman", theme: "Mysteries" },
  { month: "August", year: 2025, title: "To the Lighthouse", author: "Virginia Woolf", theme: "Beach reads" },
  { month: "September", year: 2025, title: "Sky Daddy", author: "Kate Folk", theme: "Unconventional relationships" },
  // October 2025 - N/A
  { month: "November", year: 2025, title: "The Day Lasts More than a Hundred Years", author: "Chingiz Aitmatov", theme: "Translated literature" },
  // December 2025 - Big books you've been putting off (no specific book yet)
];

const monthMap: { [key: string]: number } = {
  January: 0,
  February: 1,
  March: 2,
  April: 3,
  May: 4,
  June: 5,
  July: 6,
  August: 7,
  September: 8,
  October: 9,
  November: 10,
  December: 11,
};

async function findBookByTitleAuthor(title: string, author: string) {
  const { data, error } = await supabase
    .from("books")
    .select("id")
    .ilike("title", `%${title}%`)
    .ilike("author", `%${author}%`)
    .limit(1)
    .single();

  if (error || !data) {
    console.log(`  ⚠️  Book not found in database: "${title}" by ${author}`);
    return null;
  }

  return data.id;
}

async function searchGoogleBooks(title: string, author: string) {
  const query = `${title} ${author}`;
  const params = new URLSearchParams({
    q: query,
    maxResults: "1",
    printType: "books",
    langRestrict: "en",
  });

  const response = await fetch(
    `https://www.googleapis.com/books/v1/volumes?${params}`
  );
  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    return null;
  }

  const book = data.items[0];
  const volumeInfo = book.volumeInfo;

  return {
    title: volumeInfo.title,
    author: volumeInfo.authors?.join(", ") || author,
    isbn: volumeInfo.industryIdentifiers?.find((id: any) => id.type === "ISBN_13")?.identifier ||
          volumeInfo.industryIdentifiers?.find((id: any) => id.type === "ISBN_10")?.identifier,
    coverUrl: volumeInfo.imageLinks?.thumbnail?.replace("http://", "https://"),
    description: volumeInfo.description,
    publishedYear: volumeInfo.publishedDate
      ? parseInt(volumeInfo.publishedDate.split("-")[0])
      : null,
    externalId: book.id,
  };
}

async function addBookToDatabase(title: string, author: string) {
  // First try to find existing book
  let bookId = await findBookByTitleAuthor(title, author);
  if (bookId) {
    console.log(`  ✓ Found existing book in database`);
    return bookId;
  }

  // Search Google Books
  console.log(`  🔍 Searching Google Books...`);
  const googleBook = await searchGoogleBooks(title, author);

  if (!googleBook) {
    console.log(`  ❌ Book not found on Google Books`);
    return null;
  }

  // Add to database
  const { data, error } = await supabase
    .from("books")
    .insert({
      title: googleBook.title,
      author: googleBook.author,
      isbn: googleBook.isbn || null,
      cover_url: googleBook.coverUrl || null,
      description: googleBook.description || null,
      published_year: googleBook.publishedYear || null,
      external_id: googleBook.externalId,
      external_source: "google_books",
    })
    .select("id")
    .single();

  if (error) {
    console.log(`  ❌ Error adding book to database:`, error);
    return null;
  }

  console.log(`  ✓ Added book to database`);
  return data.id;
}

async function main() {
  console.log("🎯 Adding meetings to Book Lub...\n");

  // Find Book Lub book club
  const { data: bookClub, error: clubError } = await supabase
    .from("book_clubs")
    .select("id, name")
    .ilike("name", "%Book Lub%")
    .single();

  if (clubError || !bookClub) {
    console.log("❌ Could not find 'Book Lub' book club");
    return;
  }

  console.log(`✓ Found book club: ${bookClub.name} (${bookClub.id})\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const meeting of meetings) {
    const monthIndex = monthMap[meeting.month];
    const meetingDate = getSecondTuesday(meeting.year, monthIndex);

    console.log(
      `\n📅 ${meeting.month} ${meeting.year} - "${meeting.title}" by ${meeting.author}`
    );
    console.log(`   Date: ${meetingDate.toLocaleDateString()}`);

    // Check if meeting already exists for this date
    const { data: existingMeeting } = await supabase
      .from("meetings")
      .select("id")
      .eq("book_club_id", bookClub.id)
      .gte("meeting_date", new Date(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate()).toISOString())
      .lt("meeting_date", new Date(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate() + 1).toISOString())
      .single();

    if (existingMeeting) {
      console.log(`  ⏭️  Meeting already exists for this date, skipping...`);
      skipCount++;
      continue;
    }

    // Find or add book
    const bookId = await addBookToDatabase(meeting.title, meeting.author);
    if (!bookId) {
      console.log(`  ❌ Failed to add book, skipping meeting...`);
      errorCount++;
      continue;
    }

    // Create theme if provided
    let themeId = null;
    if (meeting.theme) {
      const { data: theme, error: themeError } = await supabase
        .from("themes")
        .insert({
          book_club_id: bookClub.id,
          name: meeting.theme,
          submitted_by: ADMIN_USER_ID,
        })
        .select("id")
        .single();

      if (!themeError && theme) {
        themeId = theme.id;
        console.log(`  ✓ Created theme: ${meeting.theme}`);
      }
    }

    // Create meeting
    const { error: meetingError } = await supabase.from("meetings").insert({
      book_club_id: bookClub.id,
      meeting_date: meetingDate.toISOString(),
      theme_id: themeId,
      selected_book_id: bookId,
      is_finalized: true,
      finalized_at: new Date().toISOString(),
      finalized_by: ADMIN_USER_ID,
    });

    if (meetingError) {
      console.log(`  ❌ Error creating meeting:`, meetingError);
      errorCount++;
      continue;
    }

    console.log(`  ✅ Meeting created successfully!`);
    successCount++;
  }

  console.log("\n\n📊 Summary:");
  console.log(`   ✅ Successfully added: ${successCount}`);
  console.log(`   ⏭️  Skipped (already exist): ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📝 Total processed: ${meetings.length}`);
}

main().catch(console.error);
