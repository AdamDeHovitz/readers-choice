import { z } from "zod";
import { keys } from "./keys";
import { defineContract } from "./operation";
import { book, rowId } from "./schemas";

/** One meeting as a club's home and schedule show it. */
const clubMeeting = z.object({
  id: z.string(),
  meetingDate: z.string(),
  nominationDeadline: z.string().nullable(),
  votingDeadline: z.string().nullable(),
  isFinalized: z.boolean(),
  /** Plain text from the host (never HTML). */
  details: z.string().nullable(),
  theme: z.object({ id: z.string(), name: z.string() }).nullable(),
  selectedBook: book.nullable(),
});
export type ClubMeeting = z.output<typeof clubMeeting>;

/**
 * A club's meetings, newest first, for its home and schedule screens.
 * Members only. `canSchedule` is whether the viewer may add meetings.
 */
export const listClubMeetings = defineContract({
  name: "meetings.list",
  kind: "query",
  input: z.object({ bookClubId: rowId }),
  output: z.object({
    club: z.object({ id: z.string(), name: z.string() }),
    canSchedule: z.boolean(),
    meetings: z.array(clubMeeting),
  }),
  cacheKey: ({ bookClubId }) => keys.clubMeetings(bookClubId),
});
