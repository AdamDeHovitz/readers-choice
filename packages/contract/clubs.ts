import { z } from "zod";
import { keys } from "./keys";
import { defineContract } from "./operation";

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
