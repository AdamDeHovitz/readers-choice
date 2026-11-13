"use server";

import * as invites from "@/server/operations/invites";
import { serverAction } from "@/app/_operations/server-action";

export const createInviteLink = serverAction(invites.createInviteLink);
export const joinBookClubViaInvite = serverAction(invites.joinViaInvite);
export const deactivateInviteLink = serverAction(invites.deactivateInviteLink);
