/**
 * Live checks against the real Open Library API. Excluded from the default
 * run; use `npm run test:integration`. Unit tests with recorded fixtures live
 * in open-library.test.ts.
 */
import { describe, it, expect } from "vitest";
import { searchBooks, type BookSearchResult } from "./open-library";

/** [query, title substring, author substring] — the book that should rank first. */
const FIRST_RESULT: [string, string, string][] = [
  ["the disappearers", "disappearers", "marlon james"],
  ["disappearers", "disappearers", "marlon james"],
  ["the disappearers marlon james", "disappearers", "marlon james"],
  ["dune", "dune", "frank herbert"],
  ["dune frank herbert", "dune", "frank herbert"],
  ["project hail mary", "project hail mary", "weir"],
  ["the art of fielding", "art of fielding", "harbach"],
  ["art of fielding", "art of fielding", "harbach"],
  ["to kill a mockingbird", "mockingbird", "harper lee"],
  ["my brilliant friend", "brilliant friend", "ferrante"],
  ["beloved", "beloved", "morrison"],
  ["james", "james", "everett"],
  ["james percival everett", "james", "everett"],
  ["piranesi", "piranesi", "susanna clarke"],
  ["demon copperhead", "demon copperhead", "kingsolver"],
  ["the covenant of water", "covenant of water", "verghese"],
  ["intermezzo sally rooney", "intermezzo", "rooney"],
  ["orbital", "orbital", "samantha harvey"],
  ["the overstory", "overstory", "powers"],
  ["one hundred years of solitude", "solitude", "garc"],
  ["pachinko", "pachinko", "min jin lee"],
  ["the remains of the day", "remains of the day", "ishiguro"],
  ["lincoln in the bardo", "bardo", "saunders"],
  ["tomorrow and tomorrow and tomorrow", "tomorrow, and tomorrow", "zevin"],
  ["the god of small things", "god of small things", "arundhati roy"],
  ["kafka on the shore", "kafka on the shore", ""], // author is listed as 村上春樹
  ["the bee sting", "bee sting", "paul murray"],
  ["prophet song", "prophet song", "paul lynch"],
  ["north woods", "north woods", "daniel mason"],
  // Orwell's work is titled "Nineteen Eighty-Four"; Open Library matches it
  // on titles it doesn't return to us.
  ["1984", "nineteen eighty-four", "george orwell"],
  ["marlon james", "", "marlon james"], // author only
];

const isBook = (book: BookSearchResult, title: string, author: string) =>
  book.title.toLowerCase().includes(title) &&
  book.author.toLowerCase().includes(author);

describe("searchBooks (live Open Library)", { timeout: 20000 }, () => {
  it.each(FIRST_RESULT)(
    "ranks the right book first for %j",
    async (query, title, author) => {
      const results = await searchBooks(query);
      expect(results.length).toBeGreaterThan(0);
      expect(
        isBook(results[0], title, author),
        results.map((b) => `${b.title} / ${b.author}`).join("\n")
      ).toBe(true);
    }
  );

  it("returns at most 5 distinct works", async () => {
    const results = await searchBooks("harry potter");
    expect(results.length).toBeLessThanOrEqual(5);
    expect(new Set(results.map((b) => b.id)).size).toBe(results.length);
  });

  it("returns [] for an empty query", async () => {
    expect(await searchBooks("")).toEqual([]);
  });
});
