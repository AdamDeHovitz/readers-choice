import { describe, expect, it } from "vitest";
import { fakeDb } from "@/test/fake-db";
import {
  getClubFeed,
  getOrCreateFeedToken,
  isWellFormedFeedToken,
  resetFeedToken,
} from "./calendar";

const TOKEN = "a".repeat(43);
const club = { id: "club", name: "Seed Club" };

describe("isWellFormedFeedToken", () => {
  it("accepts 43 base64url characters only", () => {
    expect(isWellFormedFeedToken("A-_z9".padEnd(43, "x"))).toBe(true);
    expect(isWellFormedFeedToken("a".repeat(42))).toBe(false);
    expect(isWellFormedFeedToken("a".repeat(42) + "/")).toBe(false);
    expect(isWellFormedFeedToken(null)).toBe(false);
  });
});

describe("getOrCreateFeedToken", () => {
  it("returns an existing token", async () => {
    const { db, calls } = fakeDb([{ data: { token: TOKEN } }]);
    expect(await getOrCreateFeedToken(db, "club", "user")).toBe(TOKEN);
    expect(calls).toHaveLength(1);
  });

  it("creates a well-formed token when there is none", async () => {
    const { db, calls } = fakeDb([{ data: null }, {}]);
    const token = await getOrCreateFeedToken(db, "club", "user");
    expect(isWellFormedFeedToken(token)).toBe(true);
    expect(calls[1].join(".")).toContain(`"user_id":"user"`);
  });

  it("returns the concurrently created token on a unique violation", async () => {
    const { db } = fakeDb([
      { data: null },
      { error: { code: "23505", message: "duplicate key" } },
      { data: { token: TOKEN } },
    ]);
    expect(await getOrCreateFeedToken(db, "club", "user")).toBe(TOKEN);
  });

  it("rethrows other insert errors", async () => {
    const error = { code: "42501", message: "denied" };
    const { db } = fakeDb([{ data: null }, { error }]);
    await expect(getOrCreateFeedToken(db, "club", "user")).rejects.toBe(error);
  });
});

describe("resetFeedToken", () => {
  it("replaces the member's token with a new one", async () => {
    const { db, calls } = fakeDb([{}]);
    const token = await resetFeedToken(db, "club", "user");
    expect(isWellFormedFeedToken(token)).toBe(true);
    expect(token).not.toBe(TOKEN);
    expect(calls[0].join(".")).toContain(
      `{"onConflict":"user_id,book_club_id"}`
    );
  });
});

describe("getClubFeed", () => {
  it("rejects a malformed token without querying", async () => {
    const { db, calls } = fakeDb([]);
    expect(await getClubFeed(db, "nope")).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it("returns null for an unknown token", async () => {
    const { db } = fakeDb([{ data: null }]);
    expect(await getClubFeed(db, TOKEN)).toBeNull();
  });

  it("returns null once the token's owner has left the club", async () => {
    const { db, remaining } = fakeDb([
      { data: { user_id: "user", book_clubs: club } },
      { data: null },
    ]);
    expect(await getClubFeed(db, TOKEN)).toBeNull();
    expect(remaining()).toBe(0);
  });

  it("returns recent and upcoming meetings for a member", async () => {
    const { db, calls } = fakeDb([
      { data: { user_id: "user", book_clubs: club } },
      { data: { is_admin: false } },
      {
        data: [
          {
            id: "m1",
            meeting_date: "2026-11-10T19:00:00Z",
            updated_at: "2026-11-01T00:00:00Z",
            is_finalized: true,
            details: null,
            themes: { name: "Sci-fi" },
            selected_book: { title: "Dune", author: "Frank Herbert" },
          },
          {
            id: "m2",
            meeting_date: "2026-12-10T19:00:00Z",
            updated_at: null,
            is_finalized: null,
            details: "TBD",
            themes: null,
            selected_book: null,
          },
        ],
      },
    ]);
    const feed = await getClubFeed(db, TOKEN, new Date("2026-11-10T00:00:00Z"));
    expect(feed).toEqual({
      clubName: "Seed Club",
      meetings: [
        {
          id: "m1",
          meetingDate: "2026-11-10T19:00:00Z",
          updatedAt: "2026-11-01T00:00:00Z",
          isFinalized: true,
          details: null,
          themeName: "Sci-fi",
          book: { title: "Dune", author: "Frank Herbert" },
        },
        {
          id: "m2",
          meetingDate: "2026-12-10T19:00:00Z",
          updatedAt: null,
          isFinalized: false,
          details: "TBD",
          themeName: null,
          book: null,
        },
      ],
    });
    expect(calls[2].join(".")).toContain(
      `gte("meeting_date", "2026-05-14T00:00:00.000Z")`
    );
  });
});
