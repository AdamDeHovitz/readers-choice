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
