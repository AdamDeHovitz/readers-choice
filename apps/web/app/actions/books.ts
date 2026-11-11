"use server";

import { searchBooks as searchOpenLibrary } from "@readers-choice/core/open-library";
import type { BookSearchResult } from "@readers-choice/core/open-library";
import type { ActionResult } from "@readers-choice/contract/result";
import { runAction } from "@/server/action";

/** Search Open Library; returns one result per work (no duplicate editions). */
export async function searchBooks(
  query: string
): Promise<ActionResult<BookSearchResult[]>> {
  return runAction("Book search is unavailable right now", async () => {
    const trimmed = typeof query === "string" ? query.trim() : "";
    return trimmed ? searchOpenLibrary(trimmed) : [];
  });
}
