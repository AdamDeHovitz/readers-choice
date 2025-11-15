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

  if (!session?.user?.id) {
    return null;
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

    // Check if current user is a member
    const currentUserMember = members?.find(
      (m: any) => m.user_id === session.user.id
    );

    if (!currentUserMember) {
      return null; // User is not a member
    }

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
      currentUserIsAdmin: currentUserMember.is_admin,
    };
  } catch (error) {
    console.error("Error fetching book club details:", error);
    return null;
  }
}
