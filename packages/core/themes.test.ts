import { describe, expect, it } from "vitest";
import { countThemes, themeDeletionBlocker, themesToShow } from "./themes";

const me = { userId: "me", isAdmin: false };
const admin = { userId: "me", isAdmin: true };
const unused = (submittedBy: string | null) => ({ submittedBy, timesUsed: 0 });

describe("themeDeletionBlocker", () => {
  it("lets the submitter or an admin delete an unused theme", () => {
    expect(themeDeletionBlocker(unused("me"), me)).toBeNull();
    expect(themeDeletionBlocker(unused("someone-else"), admin)).toBeNull();
    expect(themeDeletionBlocker(unused(null), admin)).toBeNull();
  });

  it("blocks other members", () => {
    expect(themeDeletionBlocker(unused("someone-else"), me)).toBe(
      "You can only delete themes you submitted or be an admin"
    );
    expect(themeDeletionBlocker(unused(null), me)).not.toBeNull();
  });

  it("blocks everyone once a meeting uses the theme", () => {
    const used = { submittedBy: "me", timesUsed: 1 };
    expect(themeDeletionBlocker(used, admin)).toBe(
      "Cannot delete theme that has been used in meetings"
    );
  });
});

describe("themesToShow and countThemes", () => {
  const theme = (
    id: string,
    upvoteCount: number,
    timesUsed: number,
    createdAt: string | null
  ) => ({
    id,
    upvoteCount,
    timesUsed,
    createdAt,
  });
  const themes = [
    theme("old-popular", 3, 0, "2026-01-01"),
    theme("new-popular", 3, 0, "2026-03-01"),
    theme("unpopular", 0, 0, "2026-04-01"),
    theme("used", 5, 2, "2025-01-01"),
    theme("undated", 3, 0, null),
  ];
  const ids = (list: { id: string }[]) => list.map((t) => t.id);

  it("shows unused themes by upvotes, then newest first", () => {
    expect(ids(themesToShow(themes, "unused"))).toEqual([
      "new-popular",
      "old-popular",
      "undated",
      "unpopular",
    ]);
  });

  it("filters used themes and shows everything for all", () => {
    expect(ids(themesToShow(themes, "used"))).toEqual(["used"]);
    expect(themesToShow(themes, "all")[0].id).toBe("used");
    expect(themesToShow(themes, "all")).toHaveLength(5);
  });

  it("doesn't reorder the input", () => {
    const before = ids(themes);
    themesToShow(themes, "all");
    expect(ids(themes)).toEqual(before);
  });

  it("counts each filter", () => {
    expect(countThemes(themes)).toEqual({ all: 5, used: 1, unused: 4 });
  });
});
