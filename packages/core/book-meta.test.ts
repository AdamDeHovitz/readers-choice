import { describe, expect, it } from "vitest";
import { bookMetaLine } from "./book-meta";

describe("bookMetaLine", () => {
  it("joins the page count and year", () => {
    expect(bookMetaLine({ pageCount: 320, publishedYear: 1999 })).toBe(
      "320 pages · Published 1999"
    );
  });

  it("shows whichever is known", () => {
    expect(bookMetaLine({ pageCount: 320, publishedYear: null })).toBe(
      "320 pages"
    );
    expect(bookMetaLine({ pageCount: null, publishedYear: 1999 })).toBe(
      "Published 1999"
    );
  });

  it("is null when neither is known", () => {
    expect(bookMetaLine({ pageCount: null, publishedYear: null })).toBeNull();
  });
});
