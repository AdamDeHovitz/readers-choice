/**
 * One-off script to consolidate duplicate themes using fuzzy matching
 * This script will:
 * 1. Find all themes that fuzzy match
 * 2. Consolidate them into a single theme
 * 3. Update all meetings to use the consolidated theme
 * 4. Update all votes to point to the consolidated theme
 * 5. Delete the duplicate themes
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { areThemesFuzzyMatch } from "../lib/fuzzy-match";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Theme {
  id: string;
  name: string;
  book_club_id: string;
  created_at: string;
  submitted_by: string;
}

async function consolidateThemes() {
  console.log("Starting theme consolidation...\n");

  // Get all themes
  const { data: allThemes, error: themesError } = await supabase
    .from("themes")
    .select("*")
    .order("created_at", { ascending: true });

  if (themesError) {
    console.error("Error fetching themes:", themesError);
    return;
  }

  if (!allThemes || allThemes.length === 0) {
    console.log("No themes found.");
    return;
  }

  console.log(`Found ${allThemes.length} themes total\n`);

  // Group themes by book club
  const themesByBookClub = allThemes.reduce(
    (acc, theme) => {
      if (!acc[theme.book_club_id]) {
        acc[theme.book_club_id] = [];
      }
      acc[theme.book_club_id].push(theme);
      return acc;
    },
    {} as Record<string, Theme[]>
  );

  let totalConsolidated = 0;

  // Process each book club
  for (const [bookClubId, themes] of Object.entries(themesByBookClub)) {
    const typedThemes = themes as Theme[];
    console.log(`\nProcessing book club ${bookClubId} (${typedThemes.length} themes)`);

    const processed = new Set<string>();
    const duplicateGroups: Theme[][] = [];

    // Find duplicate groups
    for (let i = 0; i < typedThemes.length; i++) {
      if (processed.has(typedThemes[i].id)) continue;

      const group: Theme[] = [typedThemes[i]];
      processed.add(typedThemes[i].id);

      // Find all themes that fuzzy match this one
      for (let j = i + 1; j < typedThemes.length; j++) {
        if (processed.has(typedThemes[j].id)) continue;

        if (areThemesFuzzyMatch(typedThemes[i].name, typedThemes[j].name)) {
          group.push(typedThemes[j]);
          processed.add(typedThemes[j].id);
        }
      }

      // If we found duplicates, add to duplicate groups
      if (group.length > 1) {
        duplicateGroups.push(group);
      }
    }

    if (duplicateGroups.length === 0) {
      console.log("  No duplicates found");
      continue;
    }

    console.log(`  Found ${duplicateGroups.length} duplicate group(s):\n`);

    // Consolidate each group
    for (const group of duplicateGroups) {
      // Keep the first (oldest) theme as the canonical one
      const canonical = group[0];
      const duplicates = group.slice(1);

      console.log(`  Consolidating group:`);
      console.log(`    Canonical: "${canonical.name}" (${canonical.id})`);
      console.log(`    Duplicates to merge:`);
      duplicates.forEach((dup) => {
        console.log(`      - "${dup.name}" (${dup.id})`);
      });

      // Update all meetings that use duplicate themes
      for (const duplicate of duplicates) {
        const { error: meetingError } = await supabase
          .from("meetings")
          .update({ theme_id: canonical.id })
          .eq("theme_id", duplicate.id);

        if (meetingError) {
          console.error(`    Error updating meetings:`, meetingError);
          continue;
        }

        // Update all theme votes
        const { error: voteError } = await supabase
          .from("theme_votes")
          .update({ theme_id: canonical.id })
          .eq("theme_id", duplicate.id);

        if (voteError) {
          console.error(`    Error updating votes:`, voteError);
          continue;
        }

        // Delete the duplicate theme
        const { error: deleteError } = await supabase
          .from("themes")
          .delete()
          .eq("id", duplicate.id);

        if (deleteError) {
          console.error(`    Error deleting duplicate theme:`, deleteError);
        } else {
          totalConsolidated++;
          console.log(`    ✓ Merged "${duplicate.name}" into "${canonical.name}"`);
        }
      }
    }
  }

  console.log(`\n\nConsolidation complete!`);
  console.log(`Total themes consolidated: ${totalConsolidated}`);
}

// Run the consolidation
consolidateThemes()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
