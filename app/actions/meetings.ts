"use server";

import { auth } from "@/auth";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

/**
 * Create a new meeting for a book club
 */
export async function createMeeting(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const bookClubId = formData.get("bookClubId") as string;
  const meetingDate = formData.get("meetingDate") as string;
  const nominationDeadline = formData.get("nominationDeadline") as string;
  const votingDeadline = formData.get("votingDeadline") as string;
  const themeName = formData.get("themeName") as string;
  const details = formData.get("details") as string;

  if (!bookClubId || !meetingDate) {
    return { error: "Book club ID and meeting date are required" };
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

    // Check if current user is an admin
    const { data: member } = await supabase
      .from("members")
      .select("is_admin")
      .eq("book_club_id", bookClubId)
      .eq("user_id", session.user.id)
      .single();

    if (!member?.is_admin) {
      return { error: "Only admins can create meetings" };
    }

    // Create theme if provided
    let themeId = null;
    if (themeName && themeName.trim().length > 0) {
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
      themeId = theme.id;
    }

    // Create the meeting
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .insert({
        book_club_id: bookClubId,
        meeting_date: meetingDate,
        nomination_deadline: nominationDeadline || null,
        voting_deadline: votingDeadline || null,
        theme_id: themeId,
        details: details || null,
      })
      .select()
      .single();

    if (meetingError) throw meetingError;

    revalidatePath(`/book-clubs/${bookClubId}`);
    return { success: true, meetingId: meeting.id };
  } catch (error) {
    console.error("Error creating meeting:", error);
    return { error: "Failed to create meeting" };
  }
}

/**
 * Log a past meeting with a book already selected
 */
export async function logPastMeeting(
  bookClubId: string,
  meetingDate: string,
  themeName: string | null,
  bookId: string,
  details: string | null
) {
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

    // Check if current user is an admin
    const { data: member } = await supabase
      .from("members")
      .select("is_admin")
      .eq("book_club_id", bookClubId)
      .eq("user_id", session.user.id)
      .single();

    if (!member?.is_admin) {
      return { error: "Only admins can log past meetings" };
    }

    // Create theme if provided
    let themeId = null;
    if (themeName && themeName.trim().length > 0) {
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
      themeId = theme.id;
    }

    // Create the meeting as already finalized
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .insert({
        book_club_id: bookClubId,
        meeting_date: meetingDate,
        theme_id: themeId,
        selected_book_id: bookId,
        details: details,
        is_finalized: true,
        finalized_at: new Date().toISOString(),
        finalized_by: session.user.id,
      })
      .select()
      .single();

    if (meetingError) throw meetingError;

    revalidatePath(`/book-clubs/${bookClubId}`);
    return { success: true, meetingId: meeting.id };
  } catch (error) {
    console.error("Error logging past meeting:", error);
    return { error: "Failed to log past meeting" };
  }
}

/**
 * Get meetings for a book club
 */
export async function getBookClubMeetings(bookClubId: string) {
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

    // Get meetings with related data
    const { data: meetings, error } = await supabase
      .from("meetings")
      .select(
        `
        id,
        meeting_date,
        nomination_deadline,
        voting_deadline,
        is_finalized,
        finalized_at,
        selected_book_id,
        created_at,
        details,
        themes (
          id,
          name
        ),
        selected_book:books!meetings_selected_book_id_fkey (
          id,
          title,
          author,
          cover_url,
          description,
          page_count,
          published_year
        )
      `
      )
      .eq("book_club_id", bookClubId)
      .order("meeting_date", { ascending: false });

    if (error) throw error;

    return (
      meetings?.map((meeting: any) => ({
        id: meeting.id,
        meetingDate: meeting.meeting_date,
        nominationDeadline: meeting.nomination_deadline,
        votingDeadline: meeting.voting_deadline,
        isFinalized: meeting.is_finalized,
        finalizedAt: meeting.finalized_at,
        selectedBookId: meeting.selected_book_id,
        createdAt: meeting.created_at,
        details: meeting.details,
        theme: meeting.themes
          ? {
              id: meeting.themes.id,
              name: meeting.themes.name,
            }
          : null,
        selectedBook: meeting.selected_book
          ? {
              id: meeting.selected_book.id,
              title: meeting.selected_book.title,
              author: meeting.selected_book.author,
              coverUrl: meeting.selected_book.cover_url,
              description: meeting.selected_book.description,
              pageCount: meeting.selected_book.page_count,
              publishedYear: meeting.selected_book.published_year,
            }
          : null,
      })) || []
    );
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return [];
  }
}

/**
 * Get a single meeting with all details
 */
export async function getMeetingDetails(meetingId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
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

    // Get meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select(
        `
        *,
        book_clubs!inner (
          id,
          name
        ),
        themes (
          id,
          name
        )
      `
      )
      .eq("id", meetingId)
      .single();

    if (meetingError) throw meetingError;

    const bookClubId = meeting.book_clubs.id;

    // Parallelize membership check, book options, and selected book queries
    const [memberResult, bookOptionsResult, selectedBookResult] = await Promise.all([
      supabase
        .from("members")
        .select("is_admin")
        .eq("book_club_id", bookClubId)
        .eq("user_id", session.user.id)
        .single(),
      supabase
        .from("book_options")
        .select(
          `
          id,
          created_at,
          added_by,
          books!inner (
            id,
            title,
            author,
            cover_url,
            description,
            published_year
          ),
          votes (
            id,
            user_id
          )
        `
        )
        .eq("meeting_id", meetingId),
      meeting.selected_book_id
        ? supabase
            .from("books")
            .select("id, title, author, cover_url, description, published_year")
            .eq("id", meeting.selected_book_id)
            .single()
        : Promise.resolve({ data: null }),
    ]);

    if (!memberResult.data) {
      return null;
    }

    if (bookOptionsResult.error) throw bookOptionsResult.error;

    const member = memberResult.data;
    const bookOptions = bookOptionsResult.data;
    const selectedBook = selectedBookResult.data
      ? {
          id: selectedBookResult.data.id,
          title: selectedBookResult.data.title,
          author: selectedBookResult.data.author,
          coverUrl: selectedBookResult.data.cover_url,
          description: selectedBookResult.data.description,
          publishedYear: selectedBookResult.data.published_year,
        }
      : null;

    return {
      id: meeting.id,
      meetingDate: meeting.meeting_date,
      nominationDeadline: meeting.nomination_deadline,
      votingDeadline: meeting.voting_deadline,
      isFinalized: meeting.is_finalized,
      finalizedAt: meeting.finalized_at,
      selectedBookId: meeting.selected_book_id,
      selectedBook,
      details: meeting.details,
      bookClub: {
        id: meeting.book_clubs.id,
        name: meeting.book_clubs.name,
      },
      theme: meeting.themes
        ? {
            id: meeting.themes.id,
            name: meeting.themes.name,
          }
        : null,
      bookOptions:
        bookOptions?.map((option: any) => {
          const book = option.books;
          return {
            id: option.id,
            book: {
              id: book.id,
              title: book.title,
              author: book.author,
              coverUrl: book.cover_url,
              description: book.description,
              publishedYear: book.published_year,
              cover_url: book.cover_url,
            },
            voteCount: option.votes?.length || 0,
            userHasVoted: option.votes?.some(
              (v: any) => v.user_id === session.user.id
            ),
            createdAt: option.created_at,
            added_by: option.added_by,
          };
        }) || [],
      currentUserIsAdmin: member.is_admin,
    };
  } catch (error) {
    console.error("Error fetching meeting details:", error);
    return null;
  }
}

/**
 * Delete a meeting
 */
export async function deleteMeeting(meetingId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
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

    // Get meeting to check book club membership
    const { data: meeting } = await supabase
      .from("meetings")
      .select("book_club_id")
      .eq("id", meetingId)
      .single();

    if (!meeting) {
      return { error: "Meeting not found" };
    }

    // Check if user is admin
    const { data: member } = await supabase
      .from("members")
      .select("is_admin")
      .eq("book_club_id", meeting.book_club_id)
      .eq("user_id", session.user.id)
      .single();

    if (!member?.is_admin) {
      return { error: "You must be an admin to delete meetings" };
    }

    // Delete the meeting (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from("meetings")
      .delete()
      .eq("id", meetingId);

    if (deleteError) throw deleteError;

    revalidatePath(`/book-clubs/${meeting.book_club_id}/schedule`);
    revalidatePath(`/book-clubs/${meeting.book_club_id}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting meeting:", error);
    return { error: "Failed to delete meeting" };
  }
}

/**
 * Add a book option to a meeting
 */
export async function addBookOption(meetingId: string, bookId: string) {
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

    // Get meeting's book club
    const { data: meeting } = await supabase
      .from("meetings")
      .select("book_club_id, is_finalized")
      .eq("id", meetingId)
      .single();

    if (!meeting) {
      return { error: "Meeting not found" };
    }

    if (meeting.is_finalized) {
      return { error: "Meeting has been finalized" };
    }

    // Check if user is an admin
    const { data: member } = await supabase
      .from("members")
      .select("is_admin")
      .eq("book_club_id", meeting.book_club_id)
      .eq("user_id", session.user.id)
      .single();

    if (!member?.is_admin) {
      return { error: "Only admins can add book options" };
    }

    // Add book option
    const { error } = await supabase.from("book_options").insert({
      meeting_id: meetingId,
      book_id: bookId,
      added_by: session.user.id,
    });

    if (error) throw error;

    revalidatePath(`/meetings/${meetingId}`);
    return { success: true };
  } catch (error) {
    console.error("Error adding book option:", error);
    return { error: "Failed to add book option" };
  }
}

/**
 * Vote for a book option
 */
export async function voteForBook(bookOptionId: string) {
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

    // Get book option's meeting
    const { data: bookOption } = await supabase
      .from("book_options")
      .select(
        `
        meeting_id,
        meetings!inner (
          book_club_id,
          is_finalized
        )
      `
      )
      .eq("id", bookOptionId)
      .single();

    if (!bookOption) {
      return { error: "Book option not found" };
    }

    const meeting = bookOption.meetings as any;
    if (meeting.is_finalized) {
      return { error: "Voting has closed" };
    }

    // Check if user is a member
    const { data: member } = await supabase
      .from("members")
      .select("user_id")
      .eq("book_club_id", meeting.book_club_id)
      .eq("user_id", session.user.id)
      .single();

    if (!member) {
      return { error: "Only members can vote" };
    }

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from("votes")
      .select("id")
      .eq("book_option_id", bookOptionId)
      .eq("user_id", session.user.id)
      .single();

    if (existingVote) {
      // Remove vote
      await supabase
        .from("votes")
        .delete()
        .eq("id", existingVote.id);
    } else {
      // Add vote
      await supabase.from("votes").insert({
        book_option_id: bookOptionId,
        user_id: session.user.id,
      });
    }

    revalidatePath(`/meetings/${bookOption.meeting_id}`);
    return { success: true };
  } catch (error) {
    console.error("Error voting:", error);
    return { error: "Failed to vote" };
  }
}

/**
 * Finalize a meeting and select the winning book
 */
export async function finalizeMeeting(meetingId: string, selectedBookId: string) {
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

    // Get meeting
    const { data: meeting } = await supabase
      .from("meetings")
      .select("book_club_id, is_finalized")
      .eq("id", meetingId)
      .single();

    if (!meeting) {
      return { error: "Meeting not found" };
    }

    if (meeting.is_finalized) {
      return { error: "Meeting already finalized" };
    }

    // Check if user is an admin
    const { data: member } = await supabase
      .from("members")
      .select("is_admin")
      .eq("book_club_id", meeting.book_club_id)
      .eq("user_id", session.user.id)
      .single();

    if (!member?.is_admin) {
      return { error: "Only admins can finalize meetings" };
    }

    // Finalize meeting
    const { error } = await supabase
      .from("meetings")
      .update({
        is_finalized: true,
        selected_book_id: selectedBookId,
        finalized_at: new Date().toISOString(),
        finalized_by: session.user.id,
      })
      .eq("id", meetingId);

    if (error) throw error;

    revalidatePath(`/meetings/${meetingId}`);
    revalidatePath(`/book-clubs/${meeting.book_club_id}`);
    return { success: true };
  } catch (error) {
    console.error("Error finalizing meeting:", error);
    return { error: "Failed to finalize meeting" };
  }
}

/**
 * Update a meeting's details (date, theme, or book)
 */
export async function updateMeeting(
  meetingId: string,
  meetingDate: string,
  nominationDeadline: string | null,
  votingDeadline: string | null,
  themeName: string | null,
  bookId: string | null,
  details: string | null
) {
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

    // Get meeting and check permissions
    const { data: meeting } = await supabase
      .from("meetings")
      .select("book_club_id, theme_id")
      .eq("id", meetingId)
      .single();

    if (!meeting) {
      return { error: "Meeting not found" };
    }

    // Check if user is an admin
    const { data: member } = await supabase
      .from("members")
      .select("is_admin")
      .eq("book_club_id", meeting.book_club_id)
      .eq("user_id", session.user.id)
      .single();

    if (!member?.is_admin) {
      return { error: "Only admins can update meetings" };
    }

    // Handle theme update
    let themeId = meeting.theme_id;

    if (themeName !== null) {
      if (themeName.trim().length > 0) {
        // Create new theme or update existing
        if (meeting.theme_id) {
          // Update existing theme
          await supabase
            .from("themes")
            .update({ name: themeName.trim() })
            .eq("id", meeting.theme_id);
        } else {
          // Create new theme
          const { data: newTheme } = await supabase
            .from("themes")
            .insert({
              book_club_id: meeting.book_club_id,
              name: themeName.trim(),
              submitted_by: session.user.id,
            })
            .select("id")
            .single();

          if (newTheme) {
            themeId = newTheme.id;
          }
        }
      } else if (meeting.theme_id) {
        // Remove theme if empty string provided
        themeId = null;
      }
    }

    // Update meeting
    const updateData: any = {
      meeting_date: meetingDate,
      nomination_deadline: nominationDeadline,
      voting_deadline: votingDeadline,
      theme_id: themeId,
      details: details,
    };

    if (bookId !== null) {
      updateData.selected_book_id = bookId;
    }

    const { error } = await supabase
      .from("meetings")
      .update(updateData)
      .eq("id", meetingId);

    if (error) throw error;

    revalidatePath(`/meetings/${meetingId}`);
    revalidatePath(`/book-clubs/${meeting.book_club_id}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating meeting:", error);
    return { error: "Failed to update meeting" };
  }
}

/**
 * Get the current state of a book club (nominating, voting, or no active meeting)
 */
export async function getBookClubState(bookClubId: string) {
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

    const now = new Date().toISOString();

    // Get the next upcoming meeting
    const { data: upcomingMeeting } = await supabase
      .from("meetings")
      .select(`
        id,
        meeting_date,
        nomination_deadline,
        voting_deadline,
        is_finalized,
        theme:themes(id, name)
      `)
      .eq("book_club_id", bookClubId)
      .eq("is_finalized", false)
      .gte("meeting_date", now)
      .order("meeting_date", { ascending: true })
      .limit(1)
      .single();

    // Get the most recent finalized meeting (for book display)
    const { data: previousMeeting } = await supabase
      .from("meetings")
      .select(`
        id,
        meeting_date,
        theme:themes(id, name),
        selected_book:books!meetings_selected_book_id_fkey(
          id,
          title,
          author,
          cover_url
        )
      `)
      .eq("book_club_id", bookClubId)
      .eq("is_finalized", true)
      .order("meeting_date", { ascending: false })
      .limit(1)
      .single();

    if (!upcomingMeeting) {
      // State 3: No active meeting
      return {
        state: "inactive" as const,
        meeting: null,
        book: previousMeeting || null,
      };
    }

    // Check if we're in nomination or voting phase
    const currentTime = new Date();
    const nominationDeadline = upcomingMeeting.nomination_deadline
      ? new Date(upcomingMeeting.nomination_deadline)
      : null;
    const votingDeadline = upcomingMeeting.voting_deadline
      ? new Date(upcomingMeeting.voting_deadline)
      : null;

    // State 1: Nomination phase - before nomination_deadline
    if (!nominationDeadline || currentTime <= nominationDeadline) {
      return {
        state: "nominating" as const,
        meeting: upcomingMeeting,
        book: previousMeeting || null,
      };
    }

    // State 2: Voting phase - after nomination_deadline, before voting_deadline (or meeting)
    if (!votingDeadline || currentTime <= votingDeadline) {
      return {
        state: "voting" as const,
        meeting: upcomingMeeting,
        book: previousMeeting || null,
      };
    }

    // State 3: Past deadlines but meeting not finalized yet - treat as voting
    return {
      state: "voting" as const,
      meeting: upcomingMeeting,
      book: previousMeeting || null,
    };
  } catch (error) {
    console.error("Error getting book club state:", error);
    return {
      state: "inactive" as const,
      meeting: null,
      book: null,
    };
  }
}

/**
 * Get upcoming meeting details
 */
export async function getUpcomingMeeting(bookClubId: string) {
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

    const now = new Date().toISOString();

    const { data: meeting, error } = await supabase
      .from("meetings")
      .select(`
        id,
        meeting_date,
        nomination_deadline,
        voting_deadline,
        theme:themes(id, name),
        bookOptions:book_options(
          id,
          added_by,
          book:books(
            id,
            title,
            author,
            cover_url
          )
        )
      `)
      .eq("book_club_id", bookClubId)
      .eq("is_finalized", false)
      .gte("meeting_date", now)
      .order("meeting_date", { ascending: true })
      .limit(1)
      .single();

    if (error) {
      console.error("Error fetching upcoming meeting:", error);
      return null;
    }

    return meeting;
  } catch (error) {
    console.error("Error in getUpcomingMeeting:", error);
    return null;
  }
}

/**
 * Get previous finalized meeting details
 */
export async function getPreviousMeeting(bookClubId: string) {
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

    const now = new Date().toISOString();

    // First, let's get all finalized meetings to debug
    const { data: allMeetings, error: debugError } = await supabase
      .from("meetings")
      .select(`
        id,
        meeting_date,
        is_finalized,
        selected_book_id
      `)
      .eq("book_club_id", bookClubId)
      .eq("is_finalized", true)
      .not("selected_book_id", "is", null)
      .order("meeting_date", { ascending: false });

    console.log("All finalized meetings with books:", JSON.stringify(allMeetings, null, 2));

    const { data: meeting, error } = await supabase
      .from("meetings")
      .select(`
        id,
        meeting_date,
        is_finalized,
        theme:themes(id, name),
        selected_book:books!meetings_selected_book_id_fkey(
          id,
          title,
          author,
          cover_url
        )
      `)
      .eq("book_club_id", bookClubId)
      .eq("is_finalized", true)
      .not("selected_book_id", "is", null)
      .lte("meeting_date", now)
      .order("meeting_date", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("Error fetching previous meeting:", error);
      return null;
    }

    console.log("Previous meeting returned:", JSON.stringify(meeting, null, 2));

    return meeting;
  } catch (error) {
    console.error("Error in getPreviousMeeting:", error);
    return null;
  }
}

/**
 * Get the latest finalized meeting (regardless of date)
 * Used to display the most recent book selection on the splash page
 */
export async function getLatestFinalizedMeeting(bookClubId: string) {
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

    const { data: meeting, error } = await supabase
      .from("meetings")
      .select(`
        id,
        meeting_date,
        is_finalized,
        theme:themes(id, name),
        selected_book:books!meetings_selected_book_id_fkey(
          id,
          title,
          author,
          cover_url
        )
      `)
      .eq("book_club_id", bookClubId)
      .eq("is_finalized", true)
      .not("selected_book_id", "is", null)
      .order("meeting_date", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("Error fetching latest finalized meeting:", error);
      return null;
    }

    return meeting;
  } catch (error) {
    console.error("Error in getLatestFinalizedMeeting:", error);
    return null;
  }
}
