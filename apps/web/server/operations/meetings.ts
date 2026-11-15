import "server-only";
import * as contract from "@readers-choice/contract/meetings";
import { UserError } from "@readers-choice/core/user-error";
import { requireMember } from "../authz";
import { getBookClubDetails } from "../clubs";
import { getBookClubMeetings } from "../meetings";
import { implement } from "../operation";

/** A club's home and schedule. Admins may schedule meetings. */
export const listClubMeetings = implement(
  contract.listClubMeetings,
  "Failed to load meetings",
  async (ctx, { bookClubId }) => {
    const membership = await requireMember(ctx.db, bookClubId, ctx.userId);
    const [club, meetings] = await Promise.all([
      // Cached per request: on the web, the club layout already loaded it.
      getBookClubDetails(ctx, bookClubId),
      getBookClubMeetings(ctx.db, bookClubId),
    ]);
    if (!club) throw new UserError("Book club not found");
    return {
      club: { id: club.id, name: club.name },
      canSchedule: membership.isAdmin,
      meetings,
    };
  }
);
