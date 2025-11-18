"use server";

import { auth } from "@/auth";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function createBookClub(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized - Please sign in again" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  if (!name || name.trim().length === 0) {
    return { error: "Book club name is required" };
  }

  try {
    // Use service role key to bypass RLS - server action is already protected by auth
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

    // Create the book club
    const { data: bookClub, error: bookClubError } = await supabase
      .from("book_clubs")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (bookClubError) throw bookClubError;

    // Add the creator as an admin member
    const { error: memberError } = await supabase.from("members").insert({
      user_id: session.user.id,
      book_club_id: bookClub.id,
      is_admin: true,
    });

    if (memberError) throw memberError;

    revalidatePath("/dashboard");
    return { success: true, bookClubId: bookClub.id };
  } catch (error) {
    console.error("Error creating book club:", error);
    return { error: "Failed to create book club. Please try again." };
  }
}

export async function getMyBookClubs() {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  try {
    // Use service role key to bypass RLS - server action is already protected by auth
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

    const { data, error } = await supabase
      .from("members")
      .select(
        `
        book_club_id,
        is_admin,
        joined_at,
        book_clubs!inner (
          id,
          name,
          description,
          created_at
        )
      `
      )
      .eq("user_id", session.user.id)
      .order("joined_at", { ascending: false });

    if (error) throw error;

    return (
      data?.map((member: any) => {
        const bookClub = Array.isArray(member.book_clubs)
          ? member.book_clubs[0]
          : member.book_clubs;
        return {
          id: bookClub.id,
          name: bookClub.name,
          description: bookClub.description,
          createdAt: bookClub.created_at,
          isAdmin: member.is_admin,
          joinedAt: member.joined_at,
        };
      }) || []
    );
  } catch (error) {
    console.error("Error fetching book clubs:", error);
    return [];
  }
}

export async function getBookClubDetails(bookClubId: string) {
  const session = await auth();

  try {
    // Use service role key to bypass RLS - allows public viewing
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

    // Get book club info
    const { data: bookClub, error: clubError } = await supabase
      .from("book_clubs")
      .select("*")
      .eq("id", bookClubId)
      .single();

    if (clubError) throw clubError;

    // Get members
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select(
        `
        user_id,
        is_admin,
        joined_at,
        users!inner (
          id,
          name,
          email,
          avatar_url
        )
      `
      )
      .eq("book_club_id", bookClubId)
      .order("joined_at", { ascending: true });

    if (membersError) throw membersError;

    // Check if current user is a member (if logged in)
    const currentUserMember = session?.user?.id
      ? members?.find((m: any) => m.user_id === session.user.id)
      : null;

    return {
      ...bookClub,
      members:
        members?.map((m: any) => {
          const user = Array.isArray(m.users) ? m.users[0] : m.users;
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatar_url,
            isAdmin: m.is_admin,
            joinedAt: m.joined_at,
          };
        }) || [],
      currentUserIsAdmin: currentUserMember?.is_admin || false,
      currentUserIsMember: !!currentUserMember,
    };
  } catch (error) {
    console.error("Error fetching book club details:", error);
    return null;
  }
}

export async function toggleMemberAdmin(
  bookClubId: string,
  userId: string,
  isAdmin: boolean
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
    const { data: currentMember } = await supabase
      .from("members")
      .select("is_admin")
      .eq("book_club_id", bookClubId)
      .eq("user_id", session.user.id)
      .single();

    if (!currentMember?.is_admin) {
      return { error: "Only admins can manage member roles" };
    }

    // Can't demote yourself if you're the only admin
    if (userId === session.user.id && !isAdmin) {
      const { data: adminCount } = await supabase
        .from("members")
        .select("user_id", { count: "exact" })
        .eq("book_club_id", bookClubId)
        .eq("is_admin", true);

      if ((adminCount?.length || 0) <= 1) {
        return { error: "Cannot remove the last admin" };
      }
    }

    // Update member admin status
    const { error } = await supabase
      .from("members")
      .update({ is_admin: isAdmin })
      .eq("book_club_id", bookClubId)
      .eq("user_id", userId);

    if (error) throw error;

    revalidatePath(`/book-clubs/${bookClubId}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating member role:", error);
    return { error: "Failed to update member role" };
  }
}

export async function removeMember(bookClubId: string, userId: string) {
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

    // Check if current user is an admin or removing themselves
    const { data: currentMember } = await supabase
      .from("members")
      .select("is_admin")
      .eq("book_club_id", bookClubId)
      .eq("user_id", session.user.id)
      .single();

    const isSelfRemoval = userId === session.user.id;
    const isAdmin = currentMember?.is_admin;

    if (!isSelfRemoval && !isAdmin) {
      return { error: "Only admins can remove other members" };
    }

    // If removing yourself as admin, check you're not the last admin
    if (isSelfRemoval && isAdmin) {
      const { data: adminCount } = await supabase
        .from("members")
        .select("user_id", { count: "exact" })
        .eq("book_club_id", bookClubId)
        .eq("is_admin", true);

      if ((adminCount?.length || 0) <= 1) {
        return { error: "Cannot remove the last admin" };
      }
    }

    // Remove member
    const { error } = await supabase
      .from("members")
      .delete()
      .eq("book_club_id", bookClubId)
      .eq("user_id", userId);

    if (error) throw error;

    revalidatePath(`/book-clubs/${bookClubId}`);
    return { success: true };
  } catch (error) {
    console.error("Error removing member:", error);
    return { error: "Failed to remove member" };
  }
}

export async function updateBookClubDescription(
  bookClubId: string,
  description: string
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
    const { data: currentMember } = await supabase
      .from("members")
      .select("is_admin")
      .eq("book_club_id", bookClubId)
      .eq("user_id", session.user.id)
      .single();

    if (!currentMember?.is_admin) {
      return { error: "Only admins can edit book club details" };
    }

    // Update the description
    const { error } = await supabase
      .from("book_clubs")
      .update({ description: description.trim() || null })
      .eq("id", bookClubId);

    if (error) throw error;

    revalidatePath(`/book-clubs/${bookClubId}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating book club description:", error);
    return { error: "Failed to update description" };
  }
}

export async function deleteBookClub(bookClubId: string) {
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
    const { data: currentMember } = await supabase
      .from("members")
      .select("is_admin")
      .eq("book_club_id", bookClubId)
      .eq("user_id", session.user.id)
      .single();

    if (!currentMember?.is_admin) {
      return { error: "Only admins can delete book clubs" };
    }

    // Delete the book club (cascading deletes will handle related data)
    const { error } = await supabase
      .from("book_clubs")
      .delete()
      .eq("id", bookClubId);

    if (error) throw error;

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting book club:", error);
    return { error: "Failed to delete book club" };
  }
}

/**
 * Get all book clubs (public - for browse page)
 * Shows if current user is already a member
 */
export async function getAllBookClubs() {
  const session = await auth();

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

    // Get all book clubs with member count
    const { data: bookClubs, error } = await supabase
      .from("book_clubs")
      .select(
        `
        id,
        name,
        description,
        created_at
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!bookClubs) return [];

    // Get member counts and check if current user is a member
    const bookClubsWithDetails = await Promise.all(
      bookClubs.map(async (club) => {
        // Get member count
        const { count } = await supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .eq("book_club_id", club.id);

        // Check if current user is a member (if logged in)
        let isMember = false;
        if (session?.user?.id) {
          const { data: membership } = await supabase
            .from("members")
            .select("user_id")
            .eq("book_club_id", club.id)
            .eq("user_id", session.user.id)
            .single();

          isMember = !!membership;
        }

        return {
          id: club.id,
          name: club.name,
          description: club.description,
          createdAt: club.created_at,
          memberCount: count || 0,
          isMember,
        };
      })
    );

    return bookClubsWithDetails;
  } catch (error) {
    console.error("Error fetching all book clubs:", error);
    return [];
  }
}

/**
 * Join a book club (public)
 * Anyone can join any book club
 */
export async function joinBookClub(bookClubId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Please sign in to join a book club" };
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

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("members")
      .select("user_id")
      .eq("book_club_id", bookClubId)
      .eq("user_id", session.user.id)
      .single();

    if (existingMember) {
      return { error: "You are already a member of this book club" };
    }

    // Add user as a regular member (not admin)
    const { error } = await supabase.from("members").insert({
      user_id: session.user.id,
      book_club_id: bookClubId,
      is_admin: false,
    });

    if (error) throw error;

    revalidatePath(`/book-clubs/${bookClubId}`);
    revalidatePath("/browse");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error joining book club:", error);
    return { error: "Failed to join book club. Please try again." };
  }
}
