import "server-only";
import * as contract from "@readers-choice/contract/invites";
import { keys } from "@readers-choice/contract/keys";
import { UserError } from "@readers-choice/core/user-error";
import { isMember, requireAdmin } from "../authz";
import { addMember } from "../clubs";
import * as invites from "../invites";
import { clearJoinRequest } from "../join-requests";
import { implement } from "../operation";

export const createInviteLink = implement(
  contract.createInviteLink,
  "Failed to create invite link",
  async (ctx, { bookClubId }) => {
    await requireAdmin(
      ctx.db,
      bookClubId,
      ctx.userId,
      "Only admins can create invite links"
    );
    const code = await invites.getOrCreateInviteCode(
      ctx.db,
      bookClubId,
      ctx.userId
    );
    return { code };
  }
);

export const joinViaInvite = implement(
  contract.joinViaInvite,
  "Failed to join book club",
  async (ctx, { code }) => {
    const invite = await invites.getInviteDetails(ctx.db, code);
    if (!invite) throw new UserError("Invalid or expired invite link");
    if (await isMember(ctx.db, invite.bookClubId, ctx.userId)) {
      throw new UserError("You are already a member of this book club");
    }

    await addMember(ctx.db, invite.bookClubId, ctx.userId);
    // The invite admitted them, so a request they'd made is moot.
    await clearJoinRequest(ctx.db, invite.bookClubId, ctx.userId);

    ctx.invalidate(
      keys.myClubs(),
      keys.club(invite.bookClubId),
      keys.clubDirectory()
    );
    return { bookClubId: invite.bookClubId, bookClubName: invite.bookClubName };
  }
);

export const deactivateInviteLink = implement(
  contract.deactivateInviteLink,
  "Failed to deactivate invite link",
  async (ctx, { bookClubId, code }) => {
    await requireAdmin(
      ctx.db,
      bookClubId,
      ctx.userId,
      "Only admins can deactivate invite links"
    );
    await invites.deactivateInvite(ctx.db, bookClubId, code);
  }
);
