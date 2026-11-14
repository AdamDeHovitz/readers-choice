"use server";

import * as clubs from "@/server/operations/clubs";
import { serverAction } from "@/app/_operations/server-action";

export const createBookClub = serverAction(clubs.createClub);
export const setMemberAdmin = serverAction(clubs.setMemberAdmin);
export const removeMember = serverAction(clubs.removeMember);
export const deleteBookClub = serverAction(clubs.deleteClub);
export const setJoinPolicy = serverAction(clubs.setJoinPolicy);
export const joinBookClub = serverAction(clubs.joinClub);
export const cancelJoinRequest = serverAction(clubs.cancelJoinRequest);
export const approveJoinRequest = serverAction(clubs.approveJoinRequest);
export const declineJoinRequest = serverAction(clubs.declineJoinRequest);
