import { describe, expect, it } from "vitest";
import { UserError } from "@/lib/user-error";
import { fakeDb } from "@/test/fake-db";
import { deleteUnusedTheme, findOrCreateTheme, suggestTheme } from "./themes";

describe("findOrCreateTheme", () => {
  it("treats a blank name as no theme without querying", async () => {
    const { db, calls } = fakeDb([]);
    expect(await findOrCreateTheme(db, "club", "   ", "user")).toBeNull();
    expect(await findOrCreateTheme(db, "club", null, "user")).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it("reuses an existing theme by trimmed name", async () => {
    const { db, calls } = fakeDb([{ data: { id: "t1" } }]);
    expect(await findOrCreateTheme(db, "club", "  Mysteries ", "user")).toBe(
      "t1"
    );
    expect(calls[0]).toContain('eq("name", "Mysteries")');
  });

  it("creates a missing theme", async () => {
    const { db } = fakeDb([{ data: null }, { data: { id: "new" } }]);
    expect(await findOrCreateTheme(db, "club", "Mysteries", "user")).toBe(
      "new"
    );
  });

  it("uses the concurrently created row on a unique violation", async () => {
    const { db } = fakeDb([
      { data: null },
      { error: { code: "23505", message: "duplicate key" } },
      { data: { id: "raced" } },
    ]);
    expect(await findOrCreateTheme(db, "club", "Mysteries", "user")).toBe(
      "raced"
    );
  });

  it("rethrows other insert errors", async () => {
    const error = { code: "42501", message: "denied" };
    const { db } = fakeDb([{ data: null }, { error }]);
    await expect(
      findOrCreateTheme(db, "club", "Mysteries", "user")
    ).rejects.toBe(error);
  });
});

describe("suggestTheme", () => {
  it("rejects a name similar to an existing theme", async () => {
    const { db } = fakeDb([{ data: [{ id: "t1", name: "Science Fiction" }] }]);
    await expect(
      suggestTheme(db, "club", "science fiction", "user")
    ).rejects.toThrow(UserError);
  });
});

describe("deleteUnusedTheme", () => {
  it("refuses to delete a theme a meeting uses", async () => {
    const { db, calls } = fakeDb([]);
    await expect(
      deleteUnusedTheme(db, {
        id: "t1",
        bookClubId: "club",
        submittedBy: "user",
        timesUsed: 1,
      })
    ).rejects.toThrow("Cannot delete theme that has been used in meetings");
    expect(calls).toHaveLength(0);
  });
});
