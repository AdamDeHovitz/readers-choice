"use server";

import { auth } from "@/auth";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

/**
 * Generate a random invite code
 */
function generateInviteCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create an invite link for a book club
 */
export async function createInviteLink(bookClubId: string) {
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

    // Check if user is an admin
    const { data: member } = await supabase
      .from("members")
      .select("is_admin")
      .eq("book_club_id", bookClubId)
      .eq("user_id", session.user.id)
      .single();

    if (!member?.is_admin) {
      return { error: "Only admins can create invite links" };
    }

    // Check if there's already an active invite link
    const { data: existingLink } = await supabase
      .from("invite_links")
      .select("code")
      .eq("book_club_id", bookClubId)
      .eq("is_active", true)
      .is("expires_at", null)
      .single();

    if (existingLink) {
      return { success: true, code: existingLink.code };
    }

    // Generate unique code
    let code = generateInviteCode();
    let attempts = 0;

    while (attempts < 10) {
      const { data: existing } = await supabase
        .from("invite_links")
        .select("id")
        .eq("code", code)
        .single();

      if (!existing) break;

      code = generateInviteCode();
      attempts++;
    }

    // Create invite link
    const { data: inviteLink, error: createError } = await supabase
      .from("invite_links")
      .insert({
        book_club_id: bookClubId,
        code,
        created_by: session.user.id,
      })
      .select("code")
      .single();

    if (createError) throw createError;

    revalidatePath(`/book-clubs/${bookClubId}`);
    return { success: true, code: inviteLink.code };
  } catch (error) {
    console.error("Error creating invite link:", error);
    return { error: "Failed to create invite link" };
  }
}

/**
 * Get invite link details by code
 */
export async function getInviteLinkDetails(code: string) {
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

    const { data: inviteLink, error } = await supabase
      .from("invite_links")
      .select(
        `
        id,
        book_club_id,
        is_active,
        expires_at,
        book_clubs!inner (
          id,
          name,
          description
        )
      `
      )
      .eq("code", code)
      .single();

    if (error || !inviteLink) {
      return null;
    }

    // Check if expired
    if (
      inviteLink.expires_at &&
      new Date(inviteLink.expires_at) < new Date()
    ) {
      return null;
    }

    // Check if active
    if (!inviteLink.is_active) {
      return null;
    }

    return {
      bookClubId: inviteLink.book_clubs.id,
      bookClubName: inviteLink.book_clubs.name,
      bookClubDescription: inviteLink.book_clubs.description,
    };
  } catch (error) {
    console.error("Error fetching invite link:", error);
    return null;
  }
}

/**
 * Join a book club using an invite code
 */
export async function joinBookClubViaInvite(code: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "You must be logged in to join a book club" };
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

    // Get invite link details
    const inviteDetails = await getInviteLinkDetails(code);

    if (!inviteDetails) {
      return { error: "Invalid or expired invite link" };
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("members")
      .select("id")
      .eq("book_club_id", inviteDetails.bookClubId)
      .eq("user_id", session.user.id)
      .single();

    if (existingMember) {
      return { error: "You are already a member of this book club" };
    }

    // Add user as a member
    const { error: joinError } = await supabase.from("members").insert({
      book_club_id: inviteDetails.bookClubId,
      user_id: session.user.id,
      is_admin: false,
    });

    if (joinError) throw joinError;

    revalidatePath("/dashboard");
    revalidatePath(`/book-clubs/${inviteDetails.bookClubId}`);

    return {
      success: true,
      bookClubId: inviteDetails.bookClubId,
      bookClubName: inviteDetails.bookClubName,
    };
  } catch (error) {
    console.error("Error joining book club:", error);
    return { error: "Failed to join book club" };
  }
}

/**
 * Deactivate an invite link
 */
export async function deactivateInviteLink(bookClubId: string, code: string) {
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

    // Check if user is an admin
    const { data: member } = await supabase
      .from("members")
      .select("is_admin")
      .eq("book_club_id", bookClubId)
      .eq("user_id", session.user.id)
      .single();

    if (!member?.is_admin) {
      return { error: "Only admins can deactivate invite links" };
    }

    // Deactivate the link
    const { error: updateError } = await supabase
      .from("invite_links")
      .update({ is_active: false })
      .eq("code", code)
      .eq("book_club_id", bookClubId);

    if (updateError) throw updateError;

    revalidatePath(`/book-clubs/${bookClubId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deactivating invite link:", error);
    return { error: "Failed to deactivate invite link" };
  }
}
