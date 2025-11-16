"use server";

import { auth } from "@/auth";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

/**
 * Suggest a new theme for a book club
 */
export async function suggestTheme(bookClubId: string, themeName: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if user is a member
    const { data: member } = await supabase
      .from("members")
      .select("user_id")
      .eq("book_club_id", bookClubId)
      .eq("user_id", session.user.id)
      .single();

    if (!member) {
      return { error: "You must be a member to suggest themes" };
    }

    // Check if theme already exists (case-insensitive)
    const { data: existingTheme } = await supabase
      .from("themes")
      .select("id, name")
      .eq("book_club_id", bookClubId)
      .ilike("name", themeName.trim())
      .single();

    if (existingTheme) {
      return { error: `Theme "${existingTheme.name}" already exists` };
    }

    // Create the theme
    const { data: theme, error: themeError } = await supabase
      .from("themes")
      .insert({
        book_club_id: bookClubId,
        name: themeName.trim(),
        submitted_by: session.user.id,
      })
      .select("id")
      .single();

    if (themeError) throw themeError;

    revalidatePath(`/book-clubs/${bookClubId}/themes`);
    return { success: true, themeId: theme.id };
  } catch (error) {
    console.error("Error suggesting theme:", error);
    return { error: "Failed to suggest theme" };
  }
}

/**
 * Toggle upvote on a theme
 */
export async function toggleThemeUpvote(themeId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get theme to check book_club_id
    const { data: theme, error: themeError } = await supabase
      .from("themes")
      .select("book_club_id")
      .eq("id", themeId)
      .single();

    if (themeError || !theme) {
      return { error: "Theme not found" };
    }

    // Check if user is a member
    const { data: member } = await supabase
      .from("members")
      .select("user_id")
      .eq("book_club_id", theme.book_club_id)
      .eq("user_id", session.user.id)
      .single();

    if (!member) {
      return { error: "You must be a member to vote on themes" };
    }

    // Check if user has already upvoted
    const { data: existingUpvote } = await supabase
      .from("theme_votes")
      .select("id")
      .eq("theme_id", themeId)
      .eq("user_id", session.user.id)
      .single();

    if (existingUpvote) {
      // Remove upvote
      const { error: deleteError } = await supabase
        .from("theme_votes")
        .delete()
        .eq("id", existingUpvote.id);

      if (deleteError) throw deleteError;

      revalidatePath(`/book-clubs/${theme.book_club_id}/themes`);
      return { success: true, action: "removed" };
    } else {
      // Add upvote
      const { error: insertError } = await supabase
        .from("theme_votes")
        .insert({
          theme_id: themeId,
          user_id: session.user.id,
        });

      if (insertError) throw insertError;

      revalidatePath(`/book-clubs/${theme.book_club_id}/themes`);
      return { success: true, action: "added" };
    }
  } catch (error) {
    console.error("Error toggling theme upvote:", error);
    return { error: "Failed to toggle upvote" };
  }
}

/**
 * Get theme suggestions for autocomplete (unused themes sorted by popularity)
 */
export async function getThemeSuggestions(bookClubId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if user is a member
    const { data: member } = await supabase
      .from("members")
      .select("user_id")
      .eq("book_club_id", bookClubId)
      .eq("user_id", session.user.id)
      .single();

    if (!member) {
      return [];
    }

    // Get all themes with vote counts and meetings
    const { data: themes, error } = await supabase
      .from("themes")
      .select(
        `
        id,
        name,
        theme_votes (
          id
        ),
        meetings (
          id
        )
      `
      )
      .eq("book_club_id", bookClubId);

    if (error) throw error;

    // Transform and sort: unused themes first, then by vote count
    const suggestions = (themes || [])
      .map((theme: any) => ({
        name: theme.name,
        voteCount: theme.theme_votes?.length || 0,
        isUsed: theme.meetings?.length > 0,
      }))
      .sort((a, b) => {
        // Unused themes first
        if (a.isUsed !== b.isUsed) {
          return a.isUsed ? 1 : -1;
        }
        // Then by vote count (descending)
        return b.voteCount - a.voteCount;
      })
      .map((theme) => theme.name);

    return suggestions;
  } catch (error) {
    console.error("Error fetching theme suggestions:", error);
    return [];
  }
}

/**
 * Get all themes for a book club with upvote counts and usage
 */
export async function getBookClubThemes(bookClubId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if user is a member
    const { data: member } = await supabase
      .from("members")
      .select("user_id")
      .eq("book_club_id", bookClubId)
      .eq("user_id", session.user.id)
      .single();

    if (!member) {
      return [];
    }

    // Get themes with related data
    const { data: themes, error } = await supabase
      .from("themes")
      .select(
        `
        id,
        name,
        created_at,
        submitted_by,
        users (
          id,
          name,
          avatar_url
        ),
        theme_votes (
          user_id
        ),
        meetings (
          id,
          meeting_date,
          is_finalized
        )
      `
      )
      .eq("book_club_id", bookClubId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error details:", error);
      throw error;
    }

    return (
      themes?.map((theme: any) => ({
        id: theme.id,
        name: theme.name,
        createdAt: theme.created_at,
        submittedBy: {
          id: theme.users.id,
          name: theme.users.name,
          image: theme.users.avatar_url,
        },
        upvoteCount: theme.theme_votes?.length || 0,
        userHasUpvoted: theme.theme_votes?.some(
          (upvote: any) => upvote.user_id === session.user.id
        ),
        timesUsed: theme.meetings?.length || 0,
        meetings: theme.meetings?.map((meeting: any) => ({
          id: meeting.id,
          meetingDate: meeting.meeting_date,
          isFinalized: meeting.is_finalized,
        })),
      })) || []
    );
  } catch (error) {
    console.error("Error fetching themes:", error);
    return [];
  }
}
