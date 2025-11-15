/**
 * Script to find and delete duplicate meetings
 * Run with: npx tsx scripts/clean-duplicates.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log("🔍 Finding duplicate meetings in Book Lub...\n");

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

  console.log(`✓ Found book club: ${bookClub.name}\n`);

  // Get all meetings
  const { data: meetings, error: meetingsError } = await supabase
    .from("meetings")
    .select(`
      id,
      meeting_date,
      created_at,
      books:selected_book_id (
        title,
        author
      )
    `)
    .eq("book_club_id", bookClub.id)
    .order("meeting_date", { ascending: false });

  if (meetingsError || !meetings) {
    console.log("❌ Error fetching meetings:", meetingsError);
    return;
  }

  console.log(`📊 Total meetings found: ${meetings.length}\n`);

  // Group meetings by date (ignoring time)
  const meetingsByDate = new Map<string, any[]>();

  meetings.forEach((meeting) => {
    const date = new Date(meeting.meeting_date);
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

    if (!meetingsByDate.has(dateKey)) {
      meetingsByDate.set(dateKey, []);
    }
    meetingsByDate.get(dateKey)!.push(meeting);
  });

  // Find duplicates (dates with more than one meeting)
  const duplicates: any[] = [];
  meetingsByDate.forEach((meetings, dateKey) => {
    if (meetings.length > 1) {
      duplicates.push({ dateKey, meetings });
    }
  });

  if (duplicates.length === 0) {
    console.log("✅ No duplicates found!");
    return;
  }

  console.log(`⚠️  Found ${duplicates.length} dates with duplicates:\n`);

  for (const dup of duplicates) {
    const firstMeeting = dup.meetings[0];
    const date = new Date(firstMeeting.meeting_date);

    console.log(`📅 ${date.toLocaleDateString()} - ${dup.meetings.length} meetings:`);

    // Sort by created_at to keep the oldest
    const sorted = dup.meetings.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    sorted.forEach((meeting, index) => {
      const book = Array.isArray(meeting.books) ? meeting.books[0] : meeting.books;
      const bookTitle = book?.title || "No book";
      const isKeeping = index === 0;

      console.log(`   ${isKeeping ? '✓ KEEP' : '❌ DELETE'}: ${bookTitle} (created: ${new Date(meeting.created_at).toLocaleString()})`);
      console.log(`      ID: ${meeting.id}`);
    });

    console.log();
  }

  // Ask for confirmation
  console.log("\n🗑️  Deleting duplicate meetings (keeping the oldest for each date)...\n");

  let deleteCount = 0;

  for (const dup of duplicates) {
    const sorted = dup.meetings.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Delete all except the first (oldest)
    for (let i = 1; i < sorted.length; i++) {
      const meeting = sorted[i];
      const { error } = await supabase
        .from("meetings")
        .delete()
        .eq("id", meeting.id);

      if (error) {
        console.log(`   ❌ Error deleting meeting ${meeting.id}:`, error);
      } else {
        const book = Array.isArray(meeting.books) ? meeting.books[0] : meeting.books;
        console.log(`   ✅ Deleted: ${book?.title || "No book"} (${meeting.id})`);
        deleteCount++;
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   🗑️  Deleted ${deleteCount} duplicate meetings`);
  console.log(`   ✓ Kept ${duplicates.length} original meetings`);
}

main().catch(console.error);
