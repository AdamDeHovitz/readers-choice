import { z } from "zod";
import { defineContract } from "./operation";
import { rowId } from "./schemas";

export const createInviteLink = defineContract({
  name: "invites.create",
  kind: "mutation",
  description:
    "Get a club's invite code, creating one if it has none. Club admins only. Anyone with the code can join at /join/<code>.",
  input: z.object({ bookClubId: rowId }),
  output: z.object({ code: z.string() }),
});

export const joinViaInvite = defineContract({
  name: "invites.join",
  kind: "mutation",
  description:
    "Join the club an invite code belongs to. An invite admits its holder whatever the club's join policy, and replaces any pending request.",
  input: z.object({ code: z.string() }),
  output: z.object({ bookClubId: rowId, bookClubName: z.string() }),
});

export const deactivateInviteLink = defineContract({
  name: "invites.deactivate",
  kind: "mutation",
  description:
    "Turn off a club's invite code so it no longer admits anyone. Club admins only.",
  input: z.object({ bookClubId: rowId, code: z.string() }),
  output: z.void(),
});
