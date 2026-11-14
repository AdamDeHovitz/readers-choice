import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "@/test/fake-db";
import { executeOperation } from "../operation";
import type { Viewer } from "../viewer";
import * as meetings from "./meetings";

const CLUB = "22222222-0000-4000-8000-000000000001";

function viewerWith(results: Parameters<typeof fakeDb>[0]) {
  const fake = fakeDb(results);
  const viewer: Viewer = { userId: "me", name: "Me", db: fake.db };
  return { viewer, ...fake };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("listClubMeetings", () => {
  const list = (viewer: Viewer) =>
    executeOperation(meetings.listClubMeetings, viewer, { bookClubId: CLUB });
  const club = {
    data: {
      id: CLUB,
      name: "Page Turners",
      description: null,
      join_policy: "open",
    },
  };
  const members = { data: [] };
  const meetingRow = {
    id: "m1",
    meeting_date: "2026-12-03T00:00:00Z",
    nomination_deadline: "2026-11-20T00:00:00Z",
    voting_deadline: null,
    is_finalized: true,
    details: "Bring snacks",
    themes: { id: "t1", name: "Winter" },
    selected_book: {
      id: "b1",
      title: "Piranesi",
      author: "Susanna Clarke",
      cover_url: null,
      description: "<p>A house.</p>",
      page_count: 272,
      published_year: 2020,
    },
  };

  it("refuses non-members before reading the club", async () => {
    const { viewer, calls } = viewerWith([{ data: null }]);
    expect((await list(viewer)).result).toEqual({
      success: false,
      error: "You must be a member of this book club",
      code: "refused",
    });
    expect(calls).toHaveLength(1);
  });

  it("returns the club, its meetings, and whether the viewer may schedule", async () => {
    const { viewer } = viewerWith([
      { data: { is_admin: false } },
      club,
      members,
      { data: [meetingRow] },
    ]);
    const { result } = await list(viewer);
    expect(result).toEqual({
      success: true,
      data: {
        club: { id: CLUB, name: "Page Turners" },
        canSchedule: false,
        meetings: [
          {
            id: "m1",
            meetingDate: "2026-12-03T00:00:00Z",
            nominationDeadline: "2026-11-20T00:00:00Z",
            votingDeadline: null,
            isFinalized: true,
            details: "Bring snacks",
            theme: { id: "t1", name: "Winter" },
            selectedBook: {
              id: "b1",
              title: "Piranesi",
              author: "Susanna Clarke",
              coverUrl: null,
              description: "<p>A house.</p>",
              pageCount: 272,
              publishedYear: 2020,
            },
          },
        ],
      },
    });
  });

  it("lets admins schedule", async () => {
    const { viewer } = viewerWith([
      { data: { is_admin: true } },
      club,
      members,
      { data: [] },
    ]);
    const { result } = await list(viewer);
    if (!result.success) throw new Error(result.error);
    expect(result.data.canSchedule).toBe(true);
    expect(result.data.meetings).toEqual([]);
  });
});
