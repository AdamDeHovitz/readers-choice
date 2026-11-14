import { describe, expect, it, vi } from "vitest";
import { keys } from "@readers-choice/contract/keys";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { pathsFor } from "./revalidate";

describe("pathsFor", () => {
  it("maps every cache key to the web pages that show its data", () => {
    expect(pathsFor(keys.myClubs())).toEqual(["/dashboard"]);
    expect(pathsFor(keys.clubDirectory())).toEqual(["/browse"]);
    expect(pathsFor(keys.club("club-1"))).toEqual([
      "/book-clubs/club-1",
      "/meetings",
    ]);
    expect(pathsFor(keys.clubThemes("club-1"))).toEqual([
      "/book-clubs/club-1/themes",
    ]);
  });

  it("covers every key builder", () => {
    for (const build of Object.values(keys)) {
      const key = (
        build as (...args: string[]) => Parameters<typeof pathsFor>[0]
      )("id");
      expect(pathsFor(key).length).toBeGreaterThan(0);
    }
  });
});
