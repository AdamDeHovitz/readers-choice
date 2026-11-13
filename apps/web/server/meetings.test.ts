import { describe, expect, it } from "vitest";
import { fakeDb } from "@/test/fake-db";
import {
  finalizeMeeting,
  getMeetingDetails,
  type MeetingContext,
} from "./meetings";
import type { Viewer } from "./viewer";

const meeting: MeetingContext = {
  id: "m1",
  bookClubId: "club",
  isFinalized: false,
  nominationDeadline: null,
  votingDeadline: null,
};

describe("finalizeMeeting", () => {
  it("rejects an already-finalized meeting without writing", async () => {
    const { db, calls } = fakeDb([]);
    await expect(
      finalizeMeeting(db, { ...meeting, isFinalized: true }, "b1", "admin")
    ).rejects.toThrow("Meeting already finalized");
    expect(calls).toHaveLength(0);
  });

  it("rejects a book that isn't one of the meeting's options", async () => {
    const { db, remaining } = fakeDb([{ data: null }]);
    await expect(finalizeMeeting(db, meeting, "b1", "admin")).rejects.toThrow(
      "Selected book is not an option for this meeting"
    );
    expect(remaining()).toBe(0);
  });

  it("only updates while unfinalized, so a concurrent finalize loses", async () => {
    const { db, calls } = fakeDb([{ data: { id: "o1" } }, { data: [] }]);
    await expect(finalizeMeeting(db, meeting, "b1", "admin")).rejects.toThrow(
      "Meeting already finalized"
    );
    expect(calls[1]).toContain('eq("is_finalized", false)');
  });

  it("finalizes with the selected book", async () => {
    const { db, calls } = fakeDb([
      { data: { id: "o1" } },
      { data: [{ id: "m1" }] },
    ]);
    await finalizeMeeting(db, meeting, "b1", "admin");
    expect(calls[1].join(" ")).toMatch(/"selected_book_id":"b1"/);
  });
});

describe("getMeetingDetails nominator visibility", () => {
  const meetingRow = {
    id: "m1",
    meeting_date: "2026-12-01",
    nomination_deadline: null,
    voting_deadline: null,
    is_finalized: false,
    finalized_at: null,
    selected_book_id: null,
    details: null,
    book_clubs: { id: "club", name: "Club" },
    themes: null,
    selected_book: null,
  };
  const optionRow = {
    id: "o1",
    created_at: null,
    added_by: "carol",
    description_override: null,
    page_count_override: null,
    nomination_note: "Read it!",
    nominator: { name: "Carol Member" },
    books: {
      id: "b1",
      title: "Book",
      author: "Author",
      cover_url: null,
      published_year: null,
    },
    votes: [],
  };

  async function load(isAdmin: boolean) {
    const { db } = fakeDb([
      { data: meetingRow },
      { data: { is_admin: isAdmin } },
      { data: [optionRow] },
    ]);
    const viewer = { db, userId: "viewer" } as unknown as Viewer;
    const details = await getMeetingDetails(viewer, "m1");
    return details!.bookOptions[0];
  }

  it("names the nominator for admins", async () => {
    expect((await load(true)).nominatorName).toBe("Carol Member");
  });

  it("keeps nominations anonymous for other members", async () => {
    expect((await load(false)).nominatorName).toBeNull();
  });
});
