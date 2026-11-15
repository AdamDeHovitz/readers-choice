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

export const listMyClubs = defineContract({
  name: "clubs.mine",
  kind: "query",
  description:
    "List the book clubs the user belongs to, most recently joined first, with each club's id and whether the user is an admin there.",
  input: z.object({}),
  output: z.object({ clubs: z.array(myClub) }),
  cacheKey: () => keys.myClubs(),
});

export const createClub = defineContract({
  name: "clubs.create",
  kind: "mutation",
  description:
    "Create a new book club with the user as its admin. Returns the new club's id.",
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

export const setMemberAdmin = defineContract({
  name: "clubs.setMemberAdmin",
  kind: "mutation",
  description:
    "Make a club member an admin, or remove their admin role. Club admins only; the last admin can't be demoted.",
  input: z.object({ bookClubId: rowId, userId: rowId, isAdmin: z.boolean() }),
  output: z.void(),
});

export const removeMember = defineContract({
  name: "clubs.removeMember",
  kind: "mutation",
  description:
    "Remove a member from a club. Admins can remove anyone; anyone can remove themselves, which leaves the club.",
  input: z.object({ bookClubId: rowId, userId: rowId }),
  output: z.void(),
});

export const deleteClub = defineContract({
  name: "clubs.delete",
  kind: "mutation",
  description:
    "Permanently delete a club and everything in it. Site super admins only; confirmationName must be the club's exact name.",
  input: z.object({ bookClubId: rowId, confirmationName: z.string() }),
  output: z.void(),
});

export const setJoinPolicy = defineContract({
  name: "clubs.setJoinPolicy",
  kind: "mutation",
  description:
    "Set who can join a club: anyone, by request, or invite only. Club admins only. Opening a club admits everyone with a pending request.",
  input: z.object({ bookClubId: rowId, policy: z.enum(JOIN_POLICIES) }),
  output: z.void(),
});

export const joinClub = defineContract({
  name: "clubs.join",
  kind: "mutation",
  description:
    "Join an open club, or ask to join a club that takes requests, with an optional note to the admins. Asking again while a request is pending replaces its note.",
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

export const cancelJoinRequest = defineContract({
  name: "clubs.cancelJoinRequest",
  kind: "mutation",
  description: "Withdraw the user's own pending request to join a club.",
  input: z.object({ bookClubId: rowId }),
  output: z.void(),
});

export const approveJoinRequest = defineContract({
  name: "clubs.approveJoinRequest",
  kind: "mutation",
  description: "Admit someone who asked to join a club. Club admins only.",
  input: z.object({ bookClubId: rowId, userId: rowId }),
  output: z.void(),
});

export const declineJoinRequest = defineContract({
  name: "clubs.declineJoinRequest",
  kind: "mutation",
  description:
    "Turn down a request to join a club. Club admins only. The requester isn't told, and can't ask again until a cooldown passes.",
  input: z.object({ bookClubId: rowId, userId: rowId }),
  output: z.void(),
});
