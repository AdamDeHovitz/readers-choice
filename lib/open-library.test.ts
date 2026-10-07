/**
 * Unit tests for the Open Library client. `fetch` is stubbed with responses
 * recorded from the live API (lib/__fixtures__/open-library); live checks are
 * in open-library.integration.test.ts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getBookById,
  getWorkDescription,
  searchBooks,
  searchByISBN,
} from "./open-library";
import artOfFieldingTitle from "./__fixtures__/open-library/search-art-of-fielding-title.json";
import artOfFieldingQ from "./__fixtures__/open-library/search-art-of-fielding-q.json";
import brilliantFriendTitle from "./__fixtures__/open-library/search-my-brilliant-friend-title.json";
import brilliantFriendQ from "./__fixtures__/open-library/search-my-brilliant-friend-q.json";
import harryPotterTitle from "./__fixtures__/open-library/search-harry-potter-title.json";
import harryPotterQ from "./__fixtures__/open-library/search-harry-potter-q.json";

const SEARCH_FIXTURES: Record<string, { title: unknown; q: unknown }> = {
  "the art of fielding": { title: artOfFieldingTitle, q: artOfFieldingQ },
  "my brilliant friend": { title: brilliantFriendTitle, q: brilliantFriendQ },
  "harry potter": { title: harryPotterTitle, q: harryPotterQ },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Route /search.json requests to the recorded fixtures. */
function searchRouter(input: RequestInfo | URL): Response {
  const url = new URL(String(input));
  if (url.pathname !== "/search.json") {
    return jsonResponse({ error: "not found" }, 404);
  }
  const title = url.searchParams.get("title");
  const q = url.searchParams.get("q");
  const fixture = SEARCH_FIXTURES[(title ?? q ?? "").toLowerCase()];
  if (!fixture) {
    return jsonResponse({ num_found: 0, start: 0, docs: [] });
  }
  return jsonResponse(title !== null ? fixture.title : fixture.q);
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

  it("runs a title= and a q= search in parallel", async () => {
    await searchBooks("the art of fielding");

    const urls = fetchMock.mock.calls.map(([input]) => new URL(String(input)));
    expect(urls).toHaveLength(2);
    expect(urls.map((u) => u.origin + u.pathname)).toEqual([
      "https://openlibrary.org/search.json",
      "https://openlibrary.org/search.json",
    ]);
    expect(urls[0].searchParams.get("title")).toBe("the art of fielding");
    expect(urls[1].searchParams.get("q")).toBe("the art of fielding");
  });

  it("ranks the most popular exact title match first", async () => {
    const results = await searchBooks("the art of fielding");

    expect(results[0]).toMatchObject({
      id: "OL19949436W",
      title: "The art of fielding",
      author: "Chad Harbach",
      externalId: "OL19949436W",
      externalSource: "open_library",
    });
    expect(results[0].coverUrl).toMatch(
      /^https:\/\/covers\.openlibrary\.org\/b\/id\/\d+-M\.jpg$/
    );
  });

  it("filters out q= results that only share stop words", async () => {
    const results = await searchBooks("the art of fielding");
    const titles = results.map((b) => b.title.toLowerCase());

    // Present in the raw q= fixture, but irrelevant
    expect(titles.some((t) => t.includes("wizard of oz"))).toBe(false);
    expect(titles.some((t) => t.includes("moneyball"))).toBe(false);
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
    const ferrante = results.find((b) => b.id === "OL16520879W");

    expect(ferrante).toBeDefined();
    expect(ferrante?.title).toBe("My Brilliant Friend"); // work title is "L'amica geniale"
    expect(ferrante?.author).toBe("Elena Ferrante");
  });

  it("returns [] without calling the API for a blank query", async () => {
    expect(await searchBooks("")).toEqual([]);
    expect(await searchBooks("   ")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still returns title results when the q= search fails", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.searchParams.has("q")) throw new Error("network down");
      return searchRouter(input);
    });

    const results = await searchBooks("the art of fielding");
    expect(results[0].id).toBe("OL19949436W");
  });

  it("returns [] when both searches fail", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "down" }, 503));
    expect(await searchBooks("the art of fielding")).toEqual([]);
  });
});

describe("getBookById", () => {
  it("combines work and first edition details", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/works/OL1W.json")) {
        return jsonResponse({
          key: "/works/OL1W",
          title: "A Work",
          description: { type: "/type/text", value: "Itâ€™s good." },
          covers: [42],
          first_publish_date: "May 2, 2011",
        });
      }
      if (url.includes("/works/OL1W/editions.json")) {
        return jsonResponse({
          entries: [
            {
              key: "/books/OL1M",
              number_of_pages: 300,
              isbn_13: ["9780000000002"],
            },
          ],
        });
      }
      return jsonResponse({}, 404);
    });

    expect(await getBookById("OL1W")).toEqual({
      id: "OL1W",
      title: "A Work",
      author: "Unknown Author",
      coverUrl: "https://covers.openlibrary.org/b/id/42-M.jpg",
      description: "It's good.",
      publishedYear: 2011,
      pageCount: 300,
      isbn: "9780000000002",
      externalId: "OL1W",
      externalSource: "open_library",
    });
  });

  it("leaves publishedYear undefined for an unparseable date", async () => {
    fetchMock.mockImplementation(async (input) =>
      String(input).endsWith(".json") && !String(input).includes("editions")
        ? jsonResponse({
            key: "/works/OL2W",
            title: "Undated",
            first_publish_date: "199?",
          })
        : jsonResponse({}, 404)
    );

    const result = await getBookById("OL2W");
    expect(result?.title).toBe("Undated");
    expect(result?.publishedYear).toBeUndefined();
    expect(result?.pageCount).toBeUndefined();
  });

  it("returns null when the work is missing", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 404));
    expect(await getBookById("OL404W")).toBeNull();
  });

  it("URL-encodes the work ID", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 404));
    await getBookById("../authors/x");
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://openlibrary.org/works/..%2Fauthors%2Fx.json"
    );
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

describe("searchByISBN", () => {
  it("resolves the edition's work", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/isbn/9780000000002.json")) {
        return jsonResponse({
          key: "/books/OL1M",
          works: [{ key: "/works/OL1W" }],
        });
      }
      if (url.endsWith("/works/OL1W.json")) {
        return jsonResponse({ key: "/works/OL1W", title: "Found" });
      }
      return jsonResponse({ entries: [] });
    });

    const result = await searchByISBN("9780000000002");
    expect(result?.id).toBe("OL1W");
    expect(result?.title).toBe("Found");
  });

  it("returns null when the edition has no work or is missing", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ key: "/books/OL1M" }));
    expect(await searchByISBN("1")).toBeNull();

    fetchMock.mockResolvedValueOnce(jsonResponse({}, 404));
    expect(await searchByISBN("2")).toBeNull();
  });
});
