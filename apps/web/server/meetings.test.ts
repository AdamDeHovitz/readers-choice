import { describe, expect, it } from "vitest";
import { fakeDb } from "@/test/fake-db";
import { finalizeMeeting, type MeetingContext } from "./meetings";

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
