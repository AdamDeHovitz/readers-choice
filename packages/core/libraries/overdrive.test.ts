import { describe, expect, it } from "vitest";
import {
  describeAvailability,
  isLibraryKey,
  parseAvailability,
  parseLibrarySearch,
  splitAuthors,
  summarizeAvailability,
  type Library,
  type LibraryAvailability,
} from "./overdrive";

const library: Library = { key: "nypl", name: "New York Public Library" };

function edition(overrides: Record<string, unknown> = {}) {
  return {
    id: "9935544",
    title: "James",
    firstCreatorName: "Percival Everett",
    type: { id: "ebook" },
    languages: [{ id: "en" }],
    isOwned: true,
    isAvailable: false,
    isHoldable: true,
    estimatedWaitDays: 20,
    ...overrides,
  };
}

function parse(items: unknown[], title = "James", author = "Percival Everett") {
  return parseAvailability({ items }, title, author, library);
}

describe("parseAvailability", () => {
  it("reports ebook and audiobook separately with links to the edition", () => {
    const result = parse([
      edition(),
      edition({ id: "9951347", type: { id: "audiobook" }, isAvailable: true }),
    ]);
    expect(result.formats).toEqual([
      {
        format: "ebook",
        url: "https://nypl.overdrive.com/media/9935544",
        status: "waitlist",
        estimatedWaitDays: 20,
      },
      {
        format: "audiobook",
        url: "https://nypl.overdrive.com/media/9951347",
        status: "available",
        estimatedWaitDays: null,
      },
    ]);
  });

  it("keeps the best copy when a library owns several editions", () => {
    const result = parse([
      edition({ id: "1", estimatedWaitDays: 40 }),
      edition({ id: "2", estimatedWaitDays: 9 }),
      edition({ id: "3", estimatedWaitDays: 25 }),
    ]);
    expect(result.formats).toHaveLength(1);
    expect(result.formats[0].url).toMatch(/\/media\/2$/);
  });

  it("ignores study guides, other authors, unowned and foreign editions", () => {
    const result = parse([
      edition({ title: "Summary of James" }),
      edition({ firstCreatorName: "Henry James" }),
      edition({ isOwned: false }),
      edition({ languages: [{ id: "es" }] }),
      edition({ isRestricted: true }),
      edition({ isAvailable: false, isHoldable: false }),
      edition({ id: "not-a-number" }),
    ]);
    expect(result.formats).toEqual([]);
    expect(result.searchUrl).toBe(
      "https://nypl.overdrive.com/search?query=James%20Percival%20Everett"
    );
  });

  it("matches subtitles, reordered names, and co-authored books", () => {
    expect(parse([edition({ title: "James: A Novel" })]).formats).toHaveLength(
      1
    );
    expect(
      parse([edition({ firstCreatorName: "Everett, Percival" })]).formats
    ).toHaveLength(1);
    expect(
      parse(
        [
          edition({
            title: "Good Omens",
            firstCreatorName: "Neil Gaiman",
            creators: [
              { role: "Author", name: "Neil Gaiman" },
              { role: "Author", name: "Terry Pratchett" },
            ],
          }),
        ],
        "Good Omens",
        "Terry Pratchett & Neil Gaiman"
      ).formats
    ).toHaveLength(1);
  });

  it("falls back to a catalog link for malformed responses", () => {
    expect(parseAvailability(null, "James", "x", library).formats).toEqual([]);
    expect(
      parseAvailability({ items: "nope" }, "James", "x", library).formats
    ).toEqual([]);
  });
});

describe("describeAvailability", () => {
  const waitlist = (days: number | null) => ({
    format: "ebook" as const,
    url: "",
    status: "waitlist" as const,
    estimatedWaitDays: days,
  });

  it("formats waits in days, then weeks", () => {
    expect(
      describeAvailability({ ...waitlist(null), status: "available" })
    ).toBe("available now");
    expect(describeAvailability(waitlist(1))).toBe("~1 day");
    expect(describeAvailability(waitlist(9))).toBe("~9 days");
    expect(describeAvailability(waitlist(20))).toBe("~3 weeks");
    expect(describeAvailability(waitlist(null))).toBe("waitlist");
  });
});

describe("splitAuthors", () => {
  it("splits common co-author separators", () => {
    expect(splitAuthors("Terry Pratchett & Neil Gaiman")).toEqual([
      "terry pratchett",
      "neil gaiman",
    ]);
    expect(splitAuthors("A. Smith and B. Jones")).toEqual([
      "a smith",
      "b jones",
    ]);
    expect(splitAuthors("Alexander Chee")).toEqual(["alexander chee"]);
  });
});

describe("parseLibrarySearch", () => {
  it("collapses branches into distinct library systems", () => {
    const system = (fulfillmentId: string, name: string) => ({
      fulfillmentId,
      name,
      type: "Public Library",
    });
    const results = parseLibrarySearch({
      branches: [
        {
          city: "Brooklyn",
          regionCode: "NY",
          systems: [system("brooklyn", "Brooklyn Public Library")],
        },
        {
          city: "Brooklyn",
          regionCode: "NY",
          systems: [
            system("brooklyn", "Brooklyn Public Library"),
            system("nypl", "New York Public Library"),
            system("Bad Key!", "Injected"),
          ],
        },
      ],
    });
    expect(results).toEqual([
      {
        key: "brooklyn",
        name: "Brooklyn Public Library",
        type: "Public Library",
        location: "Brooklyn, NY",
      },
      {
        key: "nypl",
        name: "New York Public Library",
        type: "Public Library",
        location: "Brooklyn, NY",
      },
    ]);
  });

  it("returns nothing for malformed responses", () => {
    expect(parseLibrarySearch(null)).toEqual([]);
    expect(parseLibrarySearch({ branches: {} })).toEqual([]);
  });
});

describe("isLibraryKey", () => {
  it("accepts OverDrive slugs only", () => {
    expect(isLibraryKey("losangeles")).toBe(true);
    expect(isLibraryKey("north-shore")).toBe(true);
    expect(isLibraryKey("../admin")).toBe(false);
    expect(isLibraryKey("NYPL")).toBe(false);
    expect(isLibraryKey(42)).toBe(false);
  });
});

describe("summarizeAvailability", () => {
  const at = (
    name: string,
    formats: LibraryAvailability["formats"]
  ): LibraryAvailability => ({
    library: { key: name.toLowerCase(), name },
    formats,
    searchUrl: "",
  });
  const fmt = (
    format: "ebook" | "audiobook",
    status: "available" | "waitlist",
    estimatedWaitDays: number | null = null
  ) => ({ format, status, url: "", estimatedWaitDays });

  it("prefers anything available now, at any library", () => {
    expect(
      summarizeAvailability([
        at("NYPL", [fmt("ebook", "waitlist", 3)]),
        at("Brooklyn", [fmt("audiobook", "available")]),
      ])
    ).toEqual({
      kind: "available",
      format: "audiobook",
      libraryName: "Brooklyn",
    });
  });

  it("otherwise picks the shortest estimated wait", () => {
    expect(
      summarizeAvailability([
        at("NYPL", [
          fmt("ebook", "waitlist", 70),
          fmt("audiobook", "waitlist"),
        ]),
        at("Brooklyn", [fmt("ebook", "waitlist", 12)]),
      ])
    ).toEqual({
      kind: "wait",
      format: "ebook",
      libraryName: "Brooklyn",
      days: 12,
    });
  });

  it("prefers an ebook over an audiobook at any library on a tie", () => {
    expect(
      summarizeAvailability([
        at("NYPL", [fmt("audiobook", "available")]),
        at("Brooklyn", [fmt("ebook", "available")]),
      ])
    ).toEqual({ kind: "available", format: "ebook", libraryName: "Brooklyn" });
    expect(
      summarizeAvailability([
        at("NYPL", [fmt("audiobook", "waitlist", 10)]),
        at("Brooklyn", [fmt("ebook", "waitlist", 10)]),
      ])
    ).toMatchObject({ format: "ebook", libraryName: "Brooklyn" });
  });

  it("still picks a much shorter audiobook wait over a long ebook wait", () => {
    expect(
      summarizeAvailability([
        at("NYPL", [
          fmt("ebook", "waitlist", 70),
          fmt("audiobook", "waitlist", 2),
        ]),
      ])
    ).toMatchObject({ kind: "wait", format: "audiobook", days: 2 });
  });

  it("keeps library order and ebooks first on ties", () => {
    expect(
      summarizeAvailability([
        at("NYPL", [fmt("ebook", "available"), fmt("audiobook", "available")]),
        at("Brooklyn", [fmt("ebook", "available")]),
      ])
    ).toEqual({ kind: "available", format: "ebook", libraryName: "NYPL" });
  });

  it("falls back to a waitlist without an estimate, then none", () => {
    expect(
      summarizeAvailability([at("NYPL", [fmt("audiobook", "waitlist")])])
    ).toEqual({ kind: "waitlist", format: "audiobook", libraryName: "NYPL" });
    expect(summarizeAvailability([at("NYPL", [])])).toEqual({ kind: "none" });
    expect(summarizeAvailability([])).toEqual({ kind: "none" });
  });
});
