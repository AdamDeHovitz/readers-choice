import { describe, expect, it } from "vitest";
import { fakeDb } from "@/test/fake-db";
import { calculateMeetingResults } from "./voting";

const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

function meetingRow(votingDeadline: string) {
  return {
    id: "m1",
    book_club_id: "club",
    is_finalized: false,
    nomination_deadline: null,
    voting_deadline: votingDeadline,
  };
}

const members = [
  { user_id: "admin", is_admin: true },
  { user_id: "member", is_admin: false },
];

const option = {
  id: "o1",
  books: { id: "b1", title: "Book", author: "A", cover_url: null },
};

/** Queued results for a meeting with one option and one approval vote. */
function results(votingDeadline: string) {
  return [
    { data: meetingRow(votingDeadline) },
    { data: members },
    { data: [option] },
    { data: [{ user_id: "member", book_option_id: "o1" }] },
    { data: [] },
    { data: [] },
  ];
}

describe("calculateMeetingResults visibility", () => {
  it("hides the live tally from members while voting is open", async () => {
    const { db } = fakeDb(results(future));
    expect(await calculateMeetingResults(db, "m1", "member")).toBeNull();
  });

  it("shows admins the live tally while voting is open", async () => {
    const { db } = fakeDb(results(future));
    const tally = await calculateMeetingResults(db, "m1", "admin");
    expect(tally?.winner?.bookOptionId).toBe("o1");
  });

  it("shows members the results once voting closes", async () => {
    const { db } = fakeDb(results(past));
    const tally = await calculateMeetingResults(db, "m1", "member");
    expect(tally?.winner?.bookOptionId).toBe("o1");
  });

  it("hides results from non-members", async () => {
    const { db } = fakeDb(results(past));
    expect(await calculateMeetingResults(db, "m1", "outsider")).toBeNull();
  });
});
