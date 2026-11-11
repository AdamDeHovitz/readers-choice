import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "@/test/fake-db";
import { executeOperation } from "../operation";
import type { Viewer } from "../viewer";
import * as themes from "./themes";

const CLUB = "22222222-0000-4000-8000-000000000001";
const THEME = "55555555-0000-4000-8000-000000000001";

function viewerWith(results: Parameters<typeof fakeDb>[0]) {
  const fake = fakeDb(results);
  const viewer: Viewer = { userId: "me", name: "Me", db: fake.db };
  return { viewer, ...fake };
}

const theme = (submittedBy: string, meetings: unknown[] = []) => ({
  data: { id: THEME, book_club_id: CLUB, submitted_by: submittedBy, meetings },
});
const member = { data: { is_admin: false } };
const admin = { data: { is_admin: true } };
const notMember = { data: null };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("suggestTheme", () => {
  it("rejects a blank name before touching the database", async () => {
    const { viewer, calls } = viewerWith([]);
    const { result } = await executeOperation(themes.suggestTheme, viewer, {
      bookClubId: CLUB,
      name: "   ",
    });
    expect(result).toEqual({ success: false, error: "Theme name is required" });
    expect(calls).toHaveLength(0);
  });

  it("rejects non-members", async () => {
    const { viewer, remaining } = viewerWith([notMember]);
    const { result } = await executeOperation(themes.suggestTheme, viewer, {
      bookClubId: CLUB,
      name: "Mysteries",
    });
    expect(result).toEqual({
      success: false,
      error: "You must be a member to suggest themes",
    });
    expect(remaining()).toBe(0);
  });

  it("creates the theme for members and invalidates the club's themes", async () => {
    const { viewer } = viewerWith([
      member,
      { data: [] },
      { data: { id: THEME } },
    ]);
    expect(
      await executeOperation(themes.suggestTheme, viewer, {
        bookClubId: CLUB,
        name: " Mysteries ",
      })
    ).toEqual({
      result: { success: true, data: { themeId: THEME } },
      invalidated: [["club", CLUB, "themes"]],
    });
  });
});

describe("toggleThemeUpvote", () => {
  it("rejects non-members of the theme's club", async () => {
    const { viewer, calls } = viewerWith([theme("someone"), notMember]);
    const { result } = await executeOperation(
      themes.toggleThemeUpvote,
      viewer,
      {
        themeId: THEME,
      }
    );
    expect(result).toEqual({
      success: false,
      error: "You must be a member to vote on themes",
    });
    expect(calls.some((c) => c[0].startsWith('from("theme_votes")'))).toBe(
      false
    );
  });
});

describe("deleteTheme", () => {
  const remove = (viewer: Viewer) =>
    executeOperation(themes.deleteTheme, viewer, { themeId: THEME });

  it("rejects members who neither submitted it nor admin the club", async () => {
    const { viewer, calls } = viewerWith([theme("someone-else"), member]);
    expect((await remove(viewer)).result).toEqual({
      success: false,
      error: "You can only delete themes you submitted or be an admin",
    });
    expect(calls).toHaveLength(2);
  });

  it("rejects non-members, even the original submitter", async () => {
    const { viewer } = viewerWith([theme("me"), notMember]);
    expect((await remove(viewer)).result).toEqual({
      success: false,
      error: "You must be a member to delete themes",
    });
  });

  it("lets the submitter delete it", async () => {
    const { viewer, calls } = viewerWith([theme("me"), member, {}]);
    expect(await remove(viewer)).toEqual({
      result: { success: true, data: undefined },
      invalidated: [["club", CLUB, "themes"]],
    });
    expect(calls[2][0]).toBe('from("themes")');
    expect(calls[2]).toContain("delete()");
  });

  it("lets an admin delete someone else's theme", async () => {
    const { viewer } = viewerWith([theme("someone-else"), admin, {}]);
    expect((await remove(viewer)).result.success).toBe(true);
  });

  it("refuses to delete a theme a meeting uses", async () => {
    const { viewer } = viewerWith([theme("me", [{ id: "m1" }]), admin]);
    expect((await remove(viewer)).result).toEqual({
      success: false,
      error: "Cannot delete theme that has been used in meetings",
    });
  });

  it("rejects a malformed id before touching the database", async () => {
    const { viewer, calls } = viewerWith([]);
    expect(
      (
        await executeOperation(themes.deleteTheme, viewer, {
          themeId: "1 OR 1=1",
        })
      ).result
    ).toEqual({ success: false, error: "Invalid id" });
    expect(calls).toHaveLength(0);
  });
});

describe("getThemeSuggestions", () => {
  it("rejects non-members", async () => {
    const { viewer } = viewerWith([notMember]);
    expect(
      (
        await executeOperation(themes.getThemeSuggestions, viewer, {
          bookClubId: CLUB,
        })
      ).result
    ).toEqual({
      success: false,
      error: "You must be a member of this book club",
    });
  });
});
