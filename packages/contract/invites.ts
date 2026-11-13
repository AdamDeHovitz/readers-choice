import { z } from "zod";
import { defineContract } from "./operation";
import { rowId } from "./schemas";

/** The club's invite code, creating one if needed (admins only). */
export const createInviteLink = defineContract({
  name: "invites.create",
  kind: "mutation",
  input: z.object({ bookClubId: rowId }),
  output: z.object({ code: z.string() }),
});

/**
 * Join the club an invite code belongs to. An invite admits its holder
 * whatever the club's join policy, and replaces any pending request.
 */
export const joinViaInvite = defineContract({
  name: "invites.join",
  kind: "mutation",
  input: z.object({ code: z.string() }),
  output: z.object({ bookClubId: rowId, bookClubName: z.string() }),
});

/** Turn off an invite code (admins only). */
export const deactivateInviteLink = defineContract({
  name: "invites.deactivate",
  kind: "mutation",
  input: z.object({ bookClubId: rowId, code: z.string() }),
  output: z.void(),
});
