import { describe, expect, it } from "vitest";
import { isRowId } from "@readers-choice/core/row-id";
import { rowId } from "./schemas";

describe("rowId and isRowId", () => {
  it("agree on what a row id looks like", () => {
    for (const value of [
      "22222222-0000-4000-8000-000000000001",
      "00000000-0000-0000-0000-000000000000",
      "ABCDEF01-2345-6789-abcd-ef0123456789",
      "not-a-uuid",
      "",
      "22222222-0000-4000-8000-00000000000",
      "22222222-0000-4000-8000-0000000000011",
      "2222222g-0000-4000-8000-000000000001",
      "22222222000040008000000000000001",
      " 22222222-0000-4000-8000-000000000001",
    ]) {
      expect(isRowId(value), value).toBe(rowId.safeParse(value).success);
    }
  });
});
