"use server";

import { revalidatePath } from "next/cache";
import { UserError } from "@/lib/user-error";
import { runAction, type ActionResult } from "@/server/action";
import { isSuperAdmin, requireAdmin } from "@/server/authz";
import { throwIfDbError } from "@/server/errors";
import { optionalText, requiredText } from "@/server/input";

/** SQLSTATE of a plain RAISE EXCEPTION in a database function. */
const RAISED_EXCEPTION = "P0001";

export async function createBookClub(input: {
  name: string;
  description?: string | null;
}): Promise<ActionResult<{ bookClubId: string }>> {
  return runAction("Failed to create book club", async ({ db, userId }) => {
    const name = requiredText(input?.name, "Book club name is required");

    const { data: club, error } = await db
      .from("book_clubs")
      .insert({
        name,
        description: optionalText(input.description),
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw error;

    const { error: memberError } = await db
      .from("members")
      .insert({ user_id: userId, book_club_id: club.id, is_admin: true });
    if (memberError) throw memberError;

    revalidatePath("/dashboard");
    return { bookClubId: club.id };
  });
}

export async function toggleMemberAdmin(
  bookClubId: string,
  userId: string,
  isAdmin: boolean
): Promise<ActionResult> {
  return runAction("Failed to update member role", async (viewer) => {
    await requireAdmin(
      viewer.db,
      bookClubId,
      viewer.userId,
      "Only admins can manage member roles"
    );

    // The database refuses to demote the club's last admin.
    const { error } = await viewer.db.rpc("set_member_admin", {
      p_book_club_id: bookClubId,
      p_user_id: userId,
      p_is_admin: isAdmin === true,
    });
    throwIfDbError(error);

    revalidatePath(`/book-clubs/${bookClubId}`);
  });
}

/** Admins can remove anyone; members can remove themselves (leave). */
export async function removeMember(
  bookClubId: string,
  userId: string
): Promise<ActionResult> {
  return runAction("Failed to remove member", async (viewer) => {
    if (userId !== viewer.userId) {
      await requireAdmin(
        viewer.db,
        bookClubId,
        viewer.userId,
        "Only admins can remove other members"
      );
    }

    // The database refuses to remove the club's last admin.
    const { error } = await viewer.db.rpc("remove_club_member", {
      p_book_club_id: bookClubId,
      p_user_id: userId,
    });
    throwIfDbError(error);

    revalidatePath(`/book-clubs/${bookClubId}`);
  });
}

export async function updateBookClubDescription(
  bookClubId: string,
  description: string
): Promise<ActionResult> {
  return runAction("Failed to update description", async ({ db, userId }) => {
    await requireAdmin(
      db,
      bookClubId,
      userId,
      "Only admins can edit book club details"
    );

    const { error } = await db
      .from("book_clubs")
      .update({ description: optionalText(description) })
      .eq("id", bookClubId);
    if (error) throw error;

    revalidatePath(`/book-clubs/${bookClubId}`);
  });
}

/** Super admins only; the name must be typed exactly to confirm. */
export async function deleteBookClub(
  bookClubId: string,
  confirmationName: string
): Promise<ActionResult> {
  return runAction("Failed to delete book club", async ({ db, userId }) => {
    if (!(await isSuperAdmin(db, userId))) {
      throw new UserError("Only super admins can delete book clubs");
    }

    const { error } = await db.rpc("delete_book_club", {
      p_book_club_id: bookClubId,
      p_actor_id: userId,
      p_confirmation_name: confirmationName,
    });
    // Its RAISE EXCEPTIONs (wrong name, not found) are written for users.
    if (error?.code === RAISED_EXCEPTION) throw new UserError(error.message);
    if (error) throw error;

    revalidatePath("/dashboard");
    revalidatePath("/browse");
    revalidatePath(`/book-clubs/${bookClubId}`, "layout");
    revalidatePath("/meetings", "layout");
  });
}

// Joining a club requires an invite code; see joinBookClubViaInvite in
// app/actions/invites.ts.
