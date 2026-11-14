import "server-only";
import * as contract from "@readers-choice/contract/clubs";
import { keys } from "@readers-choice/contract/keys";
import { UserError } from "@readers-choice/core/user-error";
import { isSuperAdmin, requireAdmin } from "../authz";
import * as clubs from "../clubs";
import * as joinRequests from "../join-requests";
import { implement } from "../operation";
import { consumeRateLimit, type RateLimitRule } from "../rate-limit";

/** The viewer's own clubs: no membership check beyond being signed in. */
export const listMyClubs = implement(
  contract.listMyClubs,
  "Failed to load your book clubs",
  async (ctx) => ({ clubs: await clubs.getMyBookClubs(ctx) })
);

export const createClub = implement(
  contract.createClub,
  "Failed to create book club",
  async (ctx, input) => {
    const bookClubId = await clubs.createBookClub(ctx.db, input, ctx.userId);
    ctx.invalidate(keys.myClubs());
    return { bookClubId };
  }
);

export const setMemberAdmin = implement(
  contract.setMemberAdmin,
  "Failed to update member role",
  async (ctx, { bookClubId, userId, isAdmin }) => {
    await requireAdmin(
      ctx.db,
      bookClubId,
      ctx.userId,
      "Only admins can manage member roles"
    );
    await clubs.setMemberAdmin(ctx.db, bookClubId, userId, isAdmin);
    ctx.invalidate(keys.club(bookClubId));
  }
);

export const removeMember = implement(
  contract.removeMember,
  "Failed to remove member",
  async (ctx, { bookClubId, userId }) => {
    if (userId !== ctx.userId) {
      await requireAdmin(
        ctx.db,
        bookClubId,
        ctx.userId,
        "Only admins can remove other members"
      );
    }
    await clubs.removeMember(ctx.db, bookClubId, userId);
    ctx.invalidate(keys.club(bookClubId), keys.clubDirectory());
    if (userId === ctx.userId) ctx.invalidate(keys.myClubs());
  }
);

export const deleteClub = implement(
  contract.deleteClub,
  "Failed to delete book club",
  async (ctx, { bookClubId, confirmationName }) => {
    if (!(await isSuperAdmin(ctx.db, ctx.userId))) {
      throw new UserError("Only super admins can delete book clubs");
    }
    await clubs.deleteBookClub(
      ctx.db,
      bookClubId,
      ctx.userId,
      confirmationName
    );
    ctx.invalidate(keys.myClubs(), keys.clubDirectory(), keys.club(bookClubId));
  }
);

export const setJoinPolicy = implement(
  contract.setJoinPolicy,
  "Failed to update who can join",
  async (ctx, { bookClubId, policy }) => {
    await requireAdmin(
      ctx.db,
      bookClubId,
      ctx.userId,
      "Only admins can change who can join"
    );
    await joinRequests.setJoinPolicy(ctx.db, bookClubId, policy);
    ctx.invalidate(keys.club(bookClubId), keys.clubDirectory());
  }
);

/** Generous for people; stops a script from spamming admins with requests. */
const JOIN_RATE_LIMIT: RateLimitRule = {
  scope: "club-join:user",
  limit: 20,
  windowSeconds: 60 * 60,
};

export const joinClub = implement(
  contract.joinClub,
  "Failed to join book club",
  async (ctx, { bookClubId, message }) => {
    if (!(await consumeRateLimit(ctx.db, JOIN_RATE_LIMIT, ctx.userId))) {
      throw new UserError("Too many attempts. Try again later.");
    }
    const status = await joinRequests.joinOrRequest(
      ctx.db,
      bookClubId,
      ctx.userId,
      message
    );
    ctx.invalidate(keys.club(bookClubId), keys.clubDirectory());
    if (status === "joined") ctx.invalidate(keys.myClubs());
    return { status };
  }
);

export const cancelJoinRequest = implement(
  contract.cancelJoinRequest,
  "Failed to cancel your request",
  async (ctx, { bookClubId }) => {
    await joinRequests.cancelJoinRequest(ctx.db, bookClubId, ctx.userId);
    ctx.invalidate(keys.club(bookClubId), keys.clubDirectory());
  }
);

export const approveJoinRequest = implement(
  contract.approveJoinRequest,
  "Failed to approve the request",
  async (ctx, { bookClubId, userId }) => {
    await requireAdmin(
      ctx.db,
      bookClubId,
      ctx.userId,
      "Only admins can approve requests"
    );
    await joinRequests.approveJoinRequest(ctx.db, bookClubId, userId);
    ctx.invalidate(keys.club(bookClubId), keys.clubDirectory());
  }
);

export const declineJoinRequest = implement(
  contract.declineJoinRequest,
  "Failed to decline the request",
  async (ctx, { bookClubId, userId }) => {
    await requireAdmin(
      ctx.db,
      bookClubId,
      ctx.userId,
      "Only admins can decline requests"
    );
    await joinRequests.declineJoinRequest(
      ctx.db,
      bookClubId,
      userId,
      ctx.userId
    );
    ctx.invalidate(keys.club(bookClubId));
  }
);
