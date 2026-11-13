import "server-only";
import * as contract from "@readers-choice/contract/clubs";
import * as clubs from "../clubs";
import { implement } from "../operation";

/** The viewer's own clubs: no membership check beyond being signed in. */
export const listMyClubs = implement(
  contract.listMyClubs,
  "Failed to load your book clubs",
  async (ctx) => ({ clubs: await clubs.getMyBookClubs(ctx) })
);
