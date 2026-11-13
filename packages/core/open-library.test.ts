/**
 * Unit tests for the Open Library client. `fetch` is stubbed with responses
 * recorded from the live API (__fixtures__/open-library); live checks are
 * in open-library.integration.test.ts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getWorkDescription, searchBooks } from "./open-library";
import artOfFieldingExact from "./__fixtures__/open-library/search-art-of-fielding-title-suggest.json";
import artOfFieldingQ from "./__fixtures__/open-library/search-art-of-fielding-q.json";
import brilliantFriendExact from "./__fixtures__/open-library/search-my-brilliant-friend-title-suggest.json";
import brilliantFriendQ from "./__fixtures__/open-library/search-my-brilliant-friend-q.json";
import disappearersExact from "./__fixtures__/open-library/search-disappearers-title-suggest.json";
import disappearersQ from "./__fixtures__/open-library/search-disappearers-q.json";
import disappearersAuthorExact from "./__fixtures__/open-library/search-disappearers-marlon-james-title-suggest.json";
import disappearersAuthorQ from "./__fixtures__/open-library/search-disappearers-marlon-james-q.json";
import nineteenEightyFourExact from "./__fixtures__/open-library/search-1984-title-suggest.json";
import nineteenEightyFourQ from "./__fixtures__/open-library/search-1984-q.json";
import harryPotterExact from "./__fixtures__/open-library/search-harry-potter-title-suggest.json";
import harryPotterQ from "./__fixtures__/open-library/search-harry-potter-q.json";

const SEARCH_FIXTURES: Record<string, { exact: unknown; q: unknown }> = {
  "the art of fielding": { exact: artOfFieldingExact, q: artOfFieldingQ },
  "my brilliant friend": { exact: brilliantFriendExact, q: brilliantFriendQ },
  "the disappearers": { exact: disappearersExact, q: disappearersQ },
  "the disappearers marlon james": {
    exact: disappearersAuthorExact,
    q: disappearersAuthorQ,
  },
  "harry potter": { exact: harryPotterExact, q: harryPotterQ },
  "1984": { exact: nineteenEightyFourExact, q: nineteenEightyFourQ },
};

const THE_DISAPPEARERS = "OL45862992W";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const EXACT_QUERY = /^title_suggest:"(.*)"$/;

/** Route /search.json requests to the recorded fixtures. */
function searchRouter(input: RequestInfo | URL): Response {
  const url = new URL(String(input));
  if (url.pathname !== "/search.json") {
    return jsonResponse({ error: "not found" }, 404);
  }
  const q = url.searchParams.get("q") ?? "";
  const exact = EXACT_QUERY.exec(q);
  const fixture = SEARCH_FIXTURES[(exact ? exact[1] : q).toLowerCase()];
  if (!fixture) {
    return jsonResponse({ num_found: 0, start: 0, docs: [] });
  }
  return jsonResponse(exact ? fixture.exact : fixture.q);
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("searchBooks", () => {
  beforeEach(() => {
    fetchMock.mockImplementation(async (input) => searchRouter(input));
  });

  it("runs an exact-title and a general search in parallel", async () => {
    await searchBooks("the art of fielding");

    const urls = fetchMock.mock.calls.map(([input]) => new URL(String(input)));
    expect(urls.map((u) => u.origin + u.pathname)).toEqual([
      "https://openlibrary.org/search.json",
      "https://openlibrary.org/search.json",
    ]);
    expect(urls.map((u) => u.searchParams.get("q"))).toEqual([
      'title_suggest:"the art of fielding"',
      "the art of fielding",
    ]);
  });

  it("strips quotes from the exact-title phrase", async () => {
    await searchBooks('the "art" of fielding');

    const [exact] = fetchMock.mock.calls.map(([input]) =>
      new URL(String(input)).searchParams.get("q")
    );
    expect(exact).toBe('title_suggest:"the  art  of fielding"');
  });

  it("ranks the most popular exact title match first", async () => {
    const results = await searchBooks("the art of fielding");

    expect(results[0]).toMatchObject({
      id: "OL15936402W",
      author: "Chad Harbach",
      externalId: "OL15936402W",
      externalSource: "open_library",
    });
    expect(results[0].title.toLowerCase()).toBe("the art of fielding");
    expect(results[0].coverUrl).toMatch(
      /^https:\/\/covers\.openlibrary\.org\/b\/id\/\d+-M\.jpg$/
    );
  });

  it("ranks title matches above results that only share common words", async () => {
    const results = await searchBooks("the art of fielding");

    expect(
      results.every((b) => b.title.toLowerCase().includes("art of fielding"))
    ).toBe(true);
  });

  it("finds an exact title that stemming buries under near-matches", async () => {
    // The general search stems "disappearers" to "disappear" and ranks
    // popular "Disappearing…" titles first; this work isn't in its top 20.
    expect(
      disappearersQ.docs.some((d) => d.key === `/works/${THE_DISAPPEARERS}`)
    ).toBe(false);

    const results = await searchBooks("the disappearers");
    expect(results[0]).toMatchObject({
      id: THE_DISAPPEARERS,
      title: "The Disappearers",
      author: "Marlon James",
    });
  });

  it("ignores author words in the query when matching titles", async () => {
    const results = await searchBooks("the disappearers marlon james");
    expect(results[0].id).toBe(THE_DISAPPEARERS);
  });

  it("keeps the general search's top result when it matched a title we can't see", async () => {
    // No returned title of Orwell's work contains "1984", but it's Open
    // Library's top general result; exact-titled adaptations must not bury it.
    const results = await searchBooks("1984");
    expect(results[0]).toMatchObject({
      id: "OL1168083W",
      author: "George Orwell",
    });
    expect(results.slice(1).every((b) => b.title.startsWith("1984"))).toBe(
      true
    );
  });

  it("deduplicates works returned by both searches", async () => {
    const results = await searchBooks("the art of fielding");
    const ids = results.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns at most 5 results", async () => {
    const results = await searchBooks("harry potter");
    expect(results).toHaveLength(5);
    expect(results.every((b) => b.title.includes("Harry Potter"))).toBe(true);
  });

  it("finds translated works by their English edition title", async () => {
    const results = await searchBooks("my brilliant friend");

    expect(results[0]).toMatchObject({
      id: "OL16520879W",
      title: "My Brilliant Friend", // work title is "L'amica geniale"
      author: "Elena Ferrante",
    });
  });

  it("returns [] without calling the API for a blank query", async () => {
    expect(await searchBooks("")).toEqual([]);
    expect(await searchBooks("   ")).toEqual([]);
    expect(await searchBooks(" ?! ")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still returns results when the exact-title search fails", async () => {
    fetchMock.mockImplementation(async (input) => {
      const q = new URL(String(input)).searchParams.get("q") ?? "";
      if (EXACT_QUERY.test(q)) throw new Error("network down");
      return searchRouter(input);
    });

    const results = await searchBooks("the art of fielding");
    expect(results[0].id).toBe("OL15936402W");
  });

  it("still finds exact titles when the general search fails", async () => {
    fetchMock.mockImplementation(async (input) => {
      const q = new URL(String(input)).searchParams.get("q") ?? "";
      if (!EXACT_QUERY.test(q)) return jsonResponse({ error: "down" }, 503);
      return searchRouter(input);
    });

    const results = await searchBooks("the disappearers");
    expect(results[0].id).toBe(THE_DISAPPEARERS);
  });

  it("returns [] when both searches fail", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "down" }, 503));
    expect(await searchBooks("the art of fielding")).toEqual([]);
  });
});

describe("getWorkDescription", () => {
  it("accepts a plain string description", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        key: "/works/OL1W",
        title: "T",
        description: "  Plain  text ",
      })
    );
    expect(await getWorkDescription("OL1W")).toBe("Plain text");
  });

  it("returns undefined when there is no description or no work", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ key: "/works/OL1W", title: "T" })
    );
    expect(await getWorkDescription("OL1W")).toBeUndefined();

    fetchMock.mockResolvedValueOnce(jsonResponse({}, 404));
    expect(await getWorkDescription("OL1W")).toBeUndefined();
  });
});
