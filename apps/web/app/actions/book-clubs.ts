"use server";

import { revalidatePath } from "next/cache";
import { UserError } from "@readers-choice/core/user-error";
import type { ActionResult } from "@readers-choice/contract/result";
import { runAction } from "@/server/action";
import { isSuperAdmin, requireAdmin } from "@/server/authz";
import * as clubs from "@/server/clubs";
import { optionalText, requiredText } from "@/server/input";

export async function createBookClub(input: {
  name: string;
  description?: string | null;
}): Promise<ActionResult<{ bookClubId: string }>> {
  return runAction("Failed to create book club", async ({ db, userId }) => {
    const bookClubId = await clubs.createBookClub(
      db,
      {
        name: requiredText(input?.name, "Book club name is required"),
        description: optionalText(input.description),
      },
      userId
    );

    revalidatePath("/dashboard");
    return { bookClubId };
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
    await clubs.setMemberAdmin(viewer.db, bookClubId, userId, isAdmin === true);

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
    await clubs.removeMember(viewer.db, bookClubId, userId);

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
    await clubs.deleteBookClub(db, bookClubId, userId, confirmationName);

    revalidatePath("/dashboard");
    revalidatePath("/browse");
    revalidatePath(`/book-clubs/${bookClubId}`, "layout");
    revalidatePath("/meetings", "layout");
  });
}

// Joining a club requires an invite code; see joinBookClubViaInvite in
// app/actions/invites.ts.
