import { describe, expect, it } from "vitest";
import { fakeDb } from "@/test/fake-db";
import { executeOperation } from "../operation";
import type { Viewer } from "../viewer";
import * as clubs from "./clubs";

describe("listMyClubs", () => {
  it("returns the viewer's memberships, newest first, as the contract shapes them", async () => {
    const fake = fakeDb([
      {
        data: [
          {
            is_admin: true,
            joined_at: "2026-02-01T00:00:00Z",
            book_clubs: { id: "c2", name: "Newer", description: null },
          },
          {
            is_admin: null,
            joined_at: "2025-01-01T00:00:00Z",
            book_clubs: { id: "c1", name: "Older", description: "Since 2025" },
          },
        ],
      },
    ]);
    const viewer: Viewer = { userId: "me", name: "Me", db: fake.db };
    expect(await executeOperation(clubs.listMyClubs, viewer, {})).toEqual({
      result: {
        success: true,
        data: {
          clubs: [
            {
              id: "c2",
              name: "Newer",
              description: null,
              isAdmin: true,
              joinedAt: "2026-02-01T00:00:00Z",
            },
            {
              id: "c1",
              name: "Older",
              description: "Since 2025",
              isAdmin: false,
              joinedAt: "2025-01-01T00:00:00Z",
            },
          ],
        },
      },
      invalidated: [],
    });
    expect(fake.calls[0]).toContain('eq("user_id", "me")');
    expect(fake.calls[0]).toContain('order("joined_at", {"ascending":false})');
  });

  it("refuses signed-out callers without querying", async () => {
    expect(
      (await executeOperation(clubs.listMyClubs, null, {})).result
    ).toMatchObject({
      success: false,
      code: "unauthenticated",
    });
  });
});

const CLUB = "22222222-0000-4000-8000-000000000001";
const ME = "11111111-0000-4000-8000-000000000001";
const OTHER = "11111111-0000-4000-8000-000000000004";

function viewerWith(results: Parameters<typeof fakeDb>[0]) {
  const fake = fakeDb(results);
  const viewer: Viewer = { userId: ME, name: "Me", db: fake.db };
  return { viewer, ...fake };
}

const admin = { data: { is_admin: true } };
const member = { data: { is_admin: false } };
const allowed = { data: true };

describe("setJoinPolicy", () => {
  it("refuses non-admins without changing anything", async () => {
    const { viewer, calls } = viewerWith([member]);
    const { result } = await executeOperation(clubs.setJoinPolicy, viewer, {
      bookClubId: CLUB,
      policy: "open",
    });
    expect(result).toEqual({
      success: false,
      error: "Only admins can change who can join",
      code: "refused",
    });
    expect(calls).toHaveLength(1);
  });

  it("rejects an unknown policy before touching the database", async () => {
    const { viewer, calls } = viewerWith([]);
    const { result } = await executeOperation(clubs.setJoinPolicy, viewer, {
      bookClubId: CLUB,
      policy: "public",
    });
    expect(result).toMatchObject({ success: false, code: "invalid_input" });
    expect(calls).toHaveLength(0);
  });

  it("sets the policy and refreshes the club and Browse", async () => {
    const { viewer, calls } = viewerWith([admin, {}]);
    expect(
      await executeOperation(clubs.setJoinPolicy, viewer, {
        bookClubId: CLUB,
        policy: "request",
      })
    ).toEqual({
      result: { success: true, data: undefined },
      invalidated: [["club", CLUB], ["clubs"]],
    });
    expect(calls[1]![0]).toBe(
      `rpc("set_club_join_policy", {"p_book_club_id":"${CLUB}","p_policy":"request"})`
    );
  });
});

describe("joinClub", () => {
  it("joins an open club and refreshes the viewer's clubs", async () => {
    const { viewer, calls } = viewerWith([allowed, { data: "joined" }]);
    expect(
      await executeOperation(clubs.joinClub, viewer, { bookClubId: CLUB })
    ).toEqual({
      result: { success: true, data: { status: "joined" } },
      invalidated: [["club", CLUB], ["clubs"], ["me", "clubs"]],
    });
    expect(calls[1]![0]).toBe(
      `rpc("join_or_request_club", {"p_book_club_id":"${CLUB}","p_user_id":"${ME}"})`
    );
  });

  it("sends a trimmed note with a request, and drops a blank one", async () => {
    const withNote = viewerWith([allowed, { data: "requested" }]);
    await executeOperation(clubs.joinClub, withNote.viewer, {
      bookClubId: CLUB,
      message: "  Carol's friend  ",
    });
    expect(withNote.calls[1]![0]).toContain(`"p_message":"Carol's friend"`);

    const blank = viewerWith([allowed, { data: "requested" }]);
    const { result } = await executeOperation(clubs.joinClub, blank.viewer, {
      bookClubId: CLUB,
      message: "   ",
    });
    expect(result).toEqual({ success: true, data: { status: "requested" } });
    expect(blank.calls[1]![0]).not.toContain("p_message");
  });

  it("rejects an overlong note", async () => {
    const { viewer, calls } = viewerWith([]);
    const { result } = await executeOperation(clubs.joinClub, viewer, {
      bookClubId: CLUB,
      message: "x".repeat(501),
    });
    expect(result).toMatchObject({ success: false, code: "invalid_input" });
    expect(calls).toHaveLength(0);
  });

  it.each([
    ["club_invite_only", "This book club is invite-only"],
    ["already_member", "You are already a member of this book club"],
    ["join_request_cooldown", "You can't ask to join this book club again yet"],
  ])("explains the database's refusal: %s", async (code, message) => {
    const { viewer } = viewerWith([allowed, { error: { message: code } }]);
    expect(
      await executeOperation(clubs.joinClub, viewer, { bookClubId: CLUB })
    ).toEqual({
      result: { success: false, error: message, code: "refused" },
      invalidated: [],
    });
  });

  it("refuses when rate limited, before asking", async () => {
    const { viewer, calls } = viewerWith([{ data: false }]);
    const { result } = await executeOperation(clubs.joinClub, viewer, {
      bookClubId: CLUB,
    });
    expect(result).toEqual({
      success: false,
      error: "Too many attempts. Try again later.",
      code: "refused",
    });
    expect(calls).toHaveLength(1);
  });
});

describe("cancelJoinRequest", () => {
  it("deletes only the viewer's own pending request", async () => {
    const { viewer, calls } = viewerWith([{}]);
    const { result } = await executeOperation(clubs.cancelJoinRequest, viewer, {
      bookClubId: CLUB,
    });
    expect(result).toEqual({ success: true, data: undefined });
    expect(calls[0]).toEqual([
      'from("join_requests")',
      "delete()",
      `eq("book_club_id", "${CLUB}")`,
      `eq("user_id", "${ME}")`,
      'eq("status", "pending")',
    ]);
  });
});

describe("approveJoinRequest", () => {
  it("refuses non-admins", async () => {
    const { viewer, calls } = viewerWith([member]);
    const { result } = await executeOperation(
      clubs.approveJoinRequest,
      viewer,
      { bookClubId: CLUB, userId: OTHER }
    );
    expect(result).toEqual({
      success: false,
      error: "Only admins can approve requests",
      code: "refused",
    });
    expect(calls).toHaveLength(1);
  });

  it("admits the requester", async () => {
    const { viewer, calls } = viewerWith([admin, { data: true }]);
    expect(
      await executeOperation(clubs.approveJoinRequest, viewer, {
        bookClubId: CLUB,
        userId: OTHER,
      })
    ).toEqual({
      result: { success: true, data: undefined },
      invalidated: [["club", CLUB], ["clubs"]],
    });
    expect(calls[1]![0]).toBe(
      `rpc("approve_join_request", {"p_book_club_id":"${CLUB}","p_user_id":"${OTHER}"})`
    );
  });

  it("says so when the request was already handled", async () => {
    const { viewer } = viewerWith([admin, { data: false }]);
    const { result } = await executeOperation(
      clubs.approveJoinRequest,
      viewer,
      { bookClubId: CLUB, userId: OTHER }
    );
    expect(result).toEqual({
      success: false,
      error: "That request is no longer pending",
      code: "refused",
    });
  });
});

describe("declineJoinRequest", () => {
  it("refuses non-admins", async () => {
    const { viewer, calls } = viewerWith([member]);
    const { result } = await executeOperation(
      clubs.declineJoinRequest,
      viewer,
      { bookClubId: CLUB, userId: OTHER }
    );
    expect(result).toMatchObject({ success: false, code: "refused" });
    expect(calls).toHaveLength(1);
  });

  it("marks the pending request declined, by whom", async () => {
    const { viewer, calls } = viewerWith([admin, { data: [{ id: "r1" }] }]);
    const { result } = await executeOperation(
      clubs.declineJoinRequest,
      viewer,
      { bookClubId: CLUB, userId: OTHER }
    );
    expect(result).toEqual({ success: true, data: undefined });
    expect(calls[1]![1]).toMatch(
      new RegExp(
        `^update\\(\\{"status":"declined","decided_at":".+","decided_by":"${ME}"\\}\\)$`
      )
    );
    expect(calls[1]).toContain('eq("status", "pending")');
  });

  it("says so when the request was already handled", async () => {
    const { viewer } = viewerWith([admin, { data: [] }]);
    const { result } = await executeOperation(
      clubs.declineJoinRequest,
      viewer,
      { bookClubId: CLUB, userId: OTHER }
    );
    expect(result).toEqual({
      success: false,
      error: "That request is no longer pending",
      code: "refused",
    });
  });
});

describe("removeMember", () => {
  it("lets members leave without being an admin", async () => {
    const { viewer, calls } = viewerWith([{ data: true }]);
    expect(
      await executeOperation(clubs.removeMember, viewer, {
        bookClubId: CLUB,
        userId: ME,
      })
    ).toEqual({
      result: { success: true, data: undefined },
      invalidated: [["club", CLUB], ["clubs"], ["me", "clubs"]],
    });
    expect(calls[0]![0]).toContain('rpc("remove_club_member"');
  });

  it("refuses non-admins removing someone else", async () => {
    const { viewer, calls } = viewerWith([member]);
    const { result } = await executeOperation(clubs.removeMember, viewer, {
      bookClubId: CLUB,
      userId: OTHER,
    });
    expect(result).toEqual({
      success: false,
      error: "Only admins can remove other members",
      code: "refused",
    });
    expect(calls).toHaveLength(1);
  });
});
