import { z } from "zod";
import {
  JOIN_POLICIES,
  JOIN_REQUEST_MESSAGE_MAX,
} from "@readers-choice/core/join-policy";
import { keys } from "./keys";
import { defineContract } from "./operation";
import { rowId } from "./schemas";

const myClub = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isAdmin: z.boolean(),
  joinedAt: z.string().nullable(),
});
export type MyClub = z.output<typeof myClub>;

/** The clubs the viewer belongs to, most recently joined first. */
export const listMyClubs = defineContract({
  name: "clubs.mine",
  kind: "query",
  input: z.object({}),
  output: z.object({ clubs: z.array(myClub) }),
  cacheKey: () => keys.myClubs(),
});

export const createClub = defineContract({
  name: "clubs.create",
  kind: "mutation",
  input: z.object({
    name: z.string().trim().min(1, "Book club name is required"),
    description: z
      .string()
      .trim()
      .nullish()
      .transform((text) => text || null),
  }),
  output: z.object({ bookClubId: rowId }),
});

/** Grant or revoke admin. Admins only; the last admin can't be demoted. */
export const setMemberAdmin = defineContract({
  name: "clubs.setMemberAdmin",
  kind: "mutation",
  input: z.object({ bookClubId: rowId, userId: rowId, isAdmin: z.boolean() }),
  output: z.void(),
});

/** Admins can remove anyone; members can remove themselves (leave). */
export const removeMember = defineContract({
  name: "clubs.removeMember",
  kind: "mutation",
  input: z.object({ bookClubId: rowId, userId: rowId }),
  output: z.void(),
});

/** Super admins only; the name must be typed exactly to confirm. */
export const deleteClub = defineContract({
  name: "clubs.delete",
  kind: "mutation",
  input: z.object({ bookClubId: rowId, confirmationName: z.string() }),
  output: z.void(),
});

/** Who can join (admins only). Opening a club admits everyone waiting. */
export const setJoinPolicy = defineContract({
  name: "clubs.setJoinPolicy",
  kind: "mutation",
  input: z.object({ bookClubId: rowId, policy: z.enum(JOIN_POLICIES) }),
  output: z.void(),
});

/**
 * Join an open club, or ask to join one that takes requests. Asking again
 * while a request is pending replaces its message.
 */
export const joinClub = defineContract({
  name: "clubs.join",
  kind: "mutation",
  input: z.object({
    bookClubId: rowId,
    message: z
      .string()
      .trim()
      .max(
        JOIN_REQUEST_MESSAGE_MAX,
        `Keep your note under ${JOIN_REQUEST_MESSAGE_MAX} characters`
      )
      .nullish()
      .transform((text) => text || null),
  }),
  output: z.object({ status: z.enum(["joined", "requested"]) }),
});

/** Withdraw the viewer's own pending request. */
export const cancelJoinRequest = defineContract({
  name: "clubs.cancelJoinRequest",
  kind: "mutation",
  input: z.object({ bookClubId: rowId }),
  output: z.void(),
});

/** Admit a requester (admins only). */
export const approveJoinRequest = defineContract({
  name: "clubs.approveJoinRequest",
  kind: "mutation",
  input: z.object({ bookClubId: rowId, userId: rowId }),
  output: z.void(),
});

/**
 * Turn a requester down (admins only). They aren't told, and can't ask again
 * until the cooldown passes.
 */
export const declineJoinRequest = defineContract({
  name: "clubs.declineJoinRequest",
  kind: "mutation",
  input: z.object({ bookClubId: rowId, userId: rowId }),
  output: z.void(),
});
