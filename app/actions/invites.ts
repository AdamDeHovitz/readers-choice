"use server";

import { revalidatePath } from "next/cache";
import { UserError } from "@/lib/user-error";
import { runAction, type ActionResult } from "@/server/action";
import { isMember, requireAdmin } from "@/server/authz";
import { getInviteDetails, getOrCreateInviteCode } from "@/server/invites";

/** The club's invite code, creating one if needed (admins only). */
export async function createInviteLink(
  bookClubId: string
): Promise<ActionResult<{ code: string }>> {
  return runAction("Failed to create invite link", async ({ db, userId }) => {
    await requireAdmin(
      db,
      bookClubId,
      userId,
      "Only admins can create invite links"
    );
    const code = await getOrCreateInviteCode(db, bookClubId, userId);
    revalidatePath(`/book-clubs/${bookClubId}`);
    return { code };
  });
}

/** Join the club an invite code belongs to. */
export async function joinBookClubViaInvite(
  code: string
): Promise<ActionResult<{ bookClubId: string; bookClubName: string }>> {
  return runAction("Failed to join book club", async ({ db, userId }) => {
    const invite = await getInviteDetails(db, code);
    if (!invite) throw new UserError("Invalid or expired invite link");
    if (await isMember(db, invite.bookClubId, userId)) {
      throw new UserError("You are already a member of this book club");
    }

    const { error } = await db.from("members").insert({
      book_club_id: invite.bookClubId,
      user_id: userId,
      is_admin: false,
    });
    if (error) throw error;

    revalidatePath("/dashboard");
    revalidatePath(`/book-clubs/${invite.bookClubId}`);
    return { bookClubId: invite.bookClubId, bookClubName: invite.bookClubName };
  });
}

/** Turn off an invite code (admins only). */
export async function deactivateInviteLink(
  bookClubId: string,
  code: string
): Promise<ActionResult> {
  return runAction(
    "Failed to deactivate invite link",
    async ({ db, userId }) => {
      await requireAdmin(
        db,
        bookClubId,
        userId,
        "Only admins can deactivate invite links"
      );

      const { error } = await db
        .from("invite_links")
        .update({ is_active: false })
        .eq("code", code)
        .eq("book_club_id", bookClubId);
      if (error) throw error;

      revalidatePath(`/book-clubs/${bookClubId}`);
    }
  );
}
