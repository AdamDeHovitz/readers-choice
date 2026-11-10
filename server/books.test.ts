import { describe, expect, it } from "vitest";
import type { BookSearchResult } from "@/lib/open-library";
import { fakeDb } from "@/test/fake-db";
import { saveBook } from "./books";

const book: BookSearchResult = {
  id: "OL1W",
  title: "Piranesi",
  author: "Susanna Clarke",
  externalId: "OL1W",
  externalSource: "open_library",
};

describe("saveBook", () => {
  it("rejects ids that aren't Open Library work ids, without querying", async () => {
    const { db, calls } = fakeDb([]);
    for (const externalId of ["OL1M", "../x", ""]) {
      await expect(saveBook(db, { ...book, externalId })).rejects.toThrow(
        "Invalid book"
      );
    }
    expect(calls).toHaveLength(0);
  });

  it("returns the existing row for a known work", async () => {
    const { db } = fakeDb([{ data: { id: "existing" } }]);
    expect(await saveBook(db, book)).toBe("existing");
  });
});
