import { describe, expect, it } from "vitest";
import { fakeDb } from "@/test/fake-db";
import { executeOperation } from "../operation";
import type { Viewer } from "../viewer";
import * as invites from "./invites";

const CLUB = "22222222-0000-4000-8000-000000000001";
const ME = "11111111-0000-4000-8000-000000000004";

function viewerWith(results: Parameters<typeof fakeDb>[0]) {
  const fake = fakeDb(results);
  const viewer: Viewer = { userId: ME, name: "Me", db: fake.db };
  return { viewer, ...fake };
}

const activeInvite = {
  data: {
    is_active: true,
    expires_at: null,
    book_clubs: { id: CLUB, name: "Seed Club", description: null },
  },
};

describe("joinViaInvite", () => {
  it("adds the member, clears any request they made, and refreshes", async () => {
    const { viewer, calls } = viewerWith([
      activeInvite,
      { data: null },
      {},
      {},
    ]);
    expect(
      await executeOperation(invites.joinViaInvite, viewer, {
        code: "abcdefgh",
      })
    ).toEqual({
      result: {
        success: true,
        data: { bookClubId: CLUB, bookClubName: "Seed Club" },
      },
      invalidated: [["me", "clubs"], ["club", CLUB], ["clubs"]],
    });
    expect(calls[2]![0]).toBe('from("members")');
    expect(calls[3]).toEqual([
      'from("join_requests")',
      "delete()",
      `eq("book_club_id", "${CLUB}")`,
      `eq("user_id", "${ME}")`,
    ]);
  });

  it("refuses an unknown code", async () => {
    const { viewer } = viewerWith([{ data: null }]);
    const { result } = await executeOperation(invites.joinViaInvite, viewer, {
      code: "abcdefgh",
    });
    expect(result).toEqual({
      success: false,
      error: "Invalid or expired invite link",
      code: "refused",
    });
  });

  it("refuses existing members", async () => {
    const { viewer, remaining } = viewerWith([
      activeInvite,
      { data: { is_admin: false } },
    ]);
    const { result } = await executeOperation(invites.joinViaInvite, viewer, {
      code: "abcdefgh",
    });
    expect(result).toMatchObject({ success: false, code: "refused" });
    expect(remaining()).toBe(0);
  });
});

describe("createInviteLink", () => {
  it("refuses non-admins", async () => {
    const { viewer, calls } = viewerWith([{ data: { is_admin: false } }]);
    const { result } = await executeOperation(
      invites.createInviteLink,
      viewer,
      {
        bookClubId: CLUB,
      }
    );
    expect(result).toEqual({
      success: false,
      error: "Only admins can create invite links",
      code: "refused",
    });
    expect(calls).toHaveLength(1);
  });
});
