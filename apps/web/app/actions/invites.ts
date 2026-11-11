"use server";

import { revalidatePath } from "next/cache";
import { UserError } from "@readers-choice/core/user-error";
import type { ActionResult } from "@readers-choice/contract/result";
import { runAction } from "@/server/action";
import { isMember, requireAdmin } from "@/server/authz";
import { addMember } from "@/server/clubs";
import {
  deactivateInvite,
  getInviteDetails,
  getOrCreateInviteCode,
} from "@/server/invites";

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

    await addMember(db, invite.bookClubId, userId);

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

      await deactivateInvite(db, bookClubId, code);

      revalidatePath(`/book-clubs/${bookClubId}`);
    }
  );
}
