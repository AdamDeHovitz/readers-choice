/**
 * Script to list all meetings to identify duplicates
 * Run with: npx tsx scripts/list-meetings.ts
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
  console.log("📋 Listing all meetings in Book Lub...\n");

  // Find Book Lub book club
  const { data: bookClub } = await supabase
    .from("book_clubs")
    .select("id, name")
    .ilike("name", "%Book Lub%")
    .single();

  if (!bookClub) {
    console.log("❌ Could not find 'Book Lub' book club");
    return;
  }

  // Get all meetings
  const { data: meetings } = await supabase
    .from("meetings")
    .select(`
      id,
      meeting_date,
      created_at,
      themes (
        name
      ),
      books:books!meetings_selected_book_id_fkey (
        title,
        author
      )
    `)
    .eq("book_club_id", bookClub.id)
    .order("meeting_date", { ascending: true });

  if (!meetings) {
    console.log("❌ No meetings found");
    return;
  }

  console.log(`Total meetings: ${meetings.length}\n`);

  meetings.forEach((meeting, index) => {
    const date = new Date(meeting.meeting_date);
    const book = meeting.books as any;
    const theme = (meeting.themes as any)?.name;

    console.log(`${index + 1}. ${date.toLocaleDateString()} - "${book?.title}" by ${book?.author}`);
    if (theme) {
      console.log(`   Theme: ${theme}`);
    }
    console.log(`   ID: ${meeting.id}`);
    console.log(`   Created: ${new Date(meeting.created_at).toLocaleString()}`);
    console.log();
  });
}

main().catch(console.error);
