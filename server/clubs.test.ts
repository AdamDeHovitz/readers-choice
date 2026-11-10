import { describe, expect, it } from "vitest";
import { fakeDb } from "@/test/fake-db";
import { createBookClub } from "./clubs";

describe("createBookClub", () => {
  it("creates the club and its admin membership in one database call", async () => {
    const { db, calls } = fakeDb([{ data: "club-1" }]);
    expect(
      await createBookClub(db, { name: "Readers", description: "Hi" }, "user-1")
    ).toBe("club-1");
    expect(calls).toEqual([
      [
        'rpc("create_book_club", {"p_name":"Readers","p_creator_id":"user-1","p_description":"Hi"})',
      ],
    ]);
  });

  it("omits a missing description so the database default applies", async () => {
    const { db, calls } = fakeDb([{ data: "club-1" }]);
    await createBookClub(db, { name: "Readers", description: null }, "user-1");
    expect(calls[0][0]).not.toContain("p_description");
  });

  it("rethrows database errors", async () => {
    const error = { message: "boom" };
    const { db } = fakeDb([{ error }]);
    await expect(
      createBookClub(db, { name: "Readers", description: null }, "user-1")
    ).rejects.toBe(error);
  });
});
