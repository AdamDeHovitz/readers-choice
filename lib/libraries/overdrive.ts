/**
 * Library availability through OverDrive, the platform behind Libby.
 *
 * Uses the same anonymous, undocumented endpoints the Libby app does:
 *   - locate.libbyapp.com/autocomplete/{query}  library directory search
 *   - thunder.api.overdrive.com/v2/libraries/{key}  library details
 *   - thunder.api.overdrive.com/v2/libraries/{key}/media  catalog search
 *
 * Only public catalog data is requested: no library cards, no patron data.
 * Waits are the library-wide estimate and can differ for a particular member.
 * These endpoints can change without notice, so every failure degrades to a
 * catalog search link instead of breaking the page.
 */

const THUNDER = "https://thunder.api.overdrive.com/v2/libraries";
const LOCATE = "https://locate.libbyapp.com/autocomplete";
const TIMEOUT_MS = 5000;

/** Most libraries a user can add; each one is a lookup per book while voting. */
export const MAX_LIBRARIES = 5;

/** A library as stored for a user. `key` is OverDrive's fulfillment id. */
export interface Library {
  key: string;
  name: string;
}

export interface LibrarySearchResult extends Library {
  /** e.g. "Public Library", "College Library". */
  type: string;
  /** "Brooklyn, NY", from the first matching branch. */
  location: string | null;
}

export type Format = "ebook" | "audiobook";

export interface FormatAvailability {
  format: Format;
  url: string;
  status: "available" | "waitlist";
  estimatedWaitDays: number | null;
}

export interface LibraryAvailability {
  library: Library;
  formats: FormatAvailability[];
  /** Catalog search for this book, shown when no edition matched. */
  searchUrl: string;
}

// OverDrive keys are short lowercase slugs ("nypl", "losangeles").
const LIBRARY_KEY = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function isLibraryKey(value: unknown): value is string {
  return typeof value === "string" && LIBRARY_KEY.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function siteUrl(key: string): string {
  return `https://${key}.overdrive.com`;
}

export function librarySearchUrl(
  library: Library,
  title: string,
  author: string
): string {
  const query = encodeURIComponent(`${title} ${author}`.trim());
  return `${siteUrl(library.key)}/search?query=${query}`;
}

function titleMatches(candidate: string, requested: string): boolean {
  // Compare main titles exactly. Substring matching would mistake study guides
  // ("Summary of James") for the nominated book.
  const main = (title: string) => normalize(title.split(":")[0]);
  const wanted = main(requested);
  return wanted.length > 0 && main(candidate) === wanted;
}

/** "A & B", "A and B", "A, B" → ["A", "B"]. */
export function splitAuthors(author: string): string[] {
  return author
    .split(/\s*(?:,|;|&|\band\b)\s*/i)
    .map(normalize)
    .filter((name) => name.length > 0);
}

/** Same person if the name tokens match in any order ("Everett, Percival"). */
function sameAuthor(a: string, b: string): boolean {
  const tokens = (name: string) => normalize(name).split(" ").sort().join(" ");
  return tokens(a) === tokens(b);
}

function editionAuthors(item: Record<string, unknown>): string[] {
  const names: string[] = [];
  if (typeof item.firstCreatorName === "string") {
    names.push(item.firstCreatorName);
  }
  if (Array.isArray(item.creators)) {
    for (const creator of item.creators) {
      if (
        isRecord(creator) &&
        creator.role === "Author" &&
        typeof creator.name === "string"
      ) {
        names.push(creator.name);
      }
    }
  }
  return names;
}

function authorMatches(item: Record<string, unknown>, requested: string) {
  const wanted = splitAuthors(requested);
  if (wanted.length === 0) return false;
  const found = editionAuthors(item);
  // One shared author is enough: catalogs often list only the first.
  return wanted.some((name) => found.some((other) => sameAuthor(name, other)));
}

/** Lower is better: available now, then the shortest wait. */
function rank(value: FormatAvailability): number {
  if (value.status === "available") return -1;
  return value.estimatedWaitDays ?? Number.MAX_SAFE_INTEGER;
}

/** Turns a catalog search response into per-format availability. */
export function parseAvailability(
  payload: unknown,
  title: string,
  author: string,
  library: Library
): LibraryAvailability {
  const result: LibraryAvailability = {
    library,
    formats: [],
    searchUrl: librarySearchUrl(library, title, author),
  };
  if (!isRecord(payload) || !Array.isArray(payload.items)) return result;

  const best = new Map<Format, FormatAvailability>();
  for (const item of payload.items as unknown[]) {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !/^\d+$/.test(item.id) ||
      typeof item.title !== "string" ||
      !isRecord(item.type) ||
      (item.type.id !== "ebook" && item.type.id !== "audiobook") ||
      !titleMatches(item.title, title) ||
      !authorMatches(item, author)
    ) {
      continue;
    }
    // Search results include titles the library doesn't own; skip those and
    // anything a member couldn't borrow or place a hold on.
    if (
      item.isOwned !== true ||
      item.isRestricted === true ||
      item.isPreReleaseTitle === true
    ) {
      continue;
    }
    const english =
      !Array.isArray(item.languages) ||
      item.languages.some((l: unknown) => isRecord(l) && l.id === "en");
    if (!english) continue;

    let status: FormatAvailability["status"];
    if (item.isAvailable === true) status = "available";
    else if (item.isHoldable === true) status = "waitlist";
    else continue;

    const wait = item.estimatedWaitDays;
    const candidate: FormatAvailability = {
      format: item.type.id,
      url: `${siteUrl(library.key)}/media/${item.id}`,
      status,
      estimatedWaitDays:
        status === "waitlist" &&
        typeof wait === "number" &&
        Number.isFinite(wait) &&
        wait > 0
          ? Math.ceil(wait)
          : null,
    };
    const previous = best.get(candidate.format);
    if (!previous || rank(candidate) < rank(previous)) {
      best.set(candidate.format, candidate);
    }
  }

  result.formats = (["ebook", "audiobook"] as const).flatMap((format) => {
    const value = best.get(format);
    return value ? [value] : [];
  });
  return result;
}

/** "~5 days", "~3 weeks". */
export function formatWait(days: number): string {
  if (days < 14) return `~${days} ${days === 1 ? "day" : "days"}`;
  return `~${Math.round(days / 7)} weeks`;
}

/** "available now", "~5 days", "~3 weeks", or "waitlist". */
export function describeAvailability(value: FormatAvailability): string {
  if (value.status === "available") return "available now";
  const days = value.estimatedWaitDays;
  return days === null ? "waitlist" : formatWait(days);
}

/** Collapses directory branches into distinct library systems. */
export function parseLibrarySearch(payload: unknown): LibrarySearchResult[] {
  if (!isRecord(payload) || !Array.isArray(payload.branches)) return [];

  const systems = new Map<string, LibrarySearchResult>();
  for (const branch of payload.branches as unknown[]) {
    if (!isRecord(branch) || !Array.isArray(branch.systems)) continue;
    const city = typeof branch.city === "string" ? branch.city : null;
    const region =
      typeof branch.regionCode === "string" ? branch.regionCode : null;
    const location = city && region ? `${city}, ${region}` : city;

    for (const system of branch.systems as unknown[]) {
      if (
        !isRecord(system) ||
        !isLibraryKey(system.fulfillmentId) ||
        typeof system.name !== "string" ||
        systems.has(system.fulfillmentId)
      ) {
        continue;
      }
      systems.set(system.fulfillmentId, {
        key: system.fulfillmentId,
        name: system.name,
        type: typeof system.type === "string" ? system.type : "Library",
        location,
      });
    }
  }
  return [...systems.values()];
}

async function getJson(url: string, revalidate: number): Promise<unknown> {
  const response = await fetch(url, {
    next: { revalidate },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  return response.json();
}

/** Searches the Libby library directory by name, city, or ZIP code. */
export async function searchLibraryDirectory(
  query: string
): Promise<LibrarySearchResult[]> {
  const payload = await getJson(
    `${LOCATE}/${encodeURIComponent(query)}`,
    86400
  );
  return parseLibrarySearch(payload);
}

/**
 * Confirms a key is a live OverDrive library and returns its canonical name.
 * Returns null for unknown keys; throws if OverDrive can't be reached.
 */
export async function lookupLibrary(key: string): Promise<Library | null> {
  if (!isLibraryKey(key)) return null;
  const response = await fetch(`${THUNDER}/${encodeURIComponent(key)}`, {
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: "application/json" },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`OverDrive returned ${response.status}`);
  const payload: unknown = await response.json();
  if (
    !isRecord(payload) ||
    typeof payload.name !== "string" ||
    payload.status !== "Live"
  ) {
    return null;
  }
  return { key, name: payload.name };
}

/** Availability of one book at each library. Never throws. */
export async function getBookAvailability(
  title: string,
  author: string,
  libraries: Library[]
): Promise<LibraryAvailability[]> {
  return Promise.all(
    libraries.map(async (library) => {
      if (!title.trim() || !author.trim()) {
        return parseAvailability(null, title, author, library);
      }
      const url = new URL(
        `${THUNDER}/${encodeURIComponent(library.key)}/media`
      );
      url.searchParams.set("query", `${title} ${author}`);
      url.searchParams.set("perPage", "24");
      try {
        const payload = await getJson(url.toString(), 900);
        return parseAvailability(payload, title, author, library);
      } catch {
        return parseAvailability(null, title, author, library);
      }
    })
  );
}

/** The single most useful fact across all of a user's libraries. */
export type AvailabilitySummary =
  | { kind: "available"; format: Format; libraryName: string }
  | { kind: "wait"; format: Format; libraryName: string; days: number }
  | { kind: "waitlist"; format: Format; libraryName: string }
  | { kind: "none" };

/**
 * Picks the quickest way to get the book: available now beats the shortest
 * estimated wait, which beats a waitlist with no estimate. On a tie an ebook
 * beats an audiobook at any library; after that, the user's library order.
 */
export function summarizeAvailability(
  results: LibraryAvailability[]
): AvailabilitySummary {
  let best: { value: FormatAvailability; libraryName: string } | null = null;
  const wait = (value: FormatAvailability) =>
    value.status === "available"
      ? -1
      : (value.estimatedWaitDays ?? Number.MAX_SAFE_INTEGER);
  const better = (a: FormatAvailability, b: FormatAvailability) =>
    wait(a) !== wait(b)
      ? wait(a) < wait(b)
      : a.format === "ebook" && b.format === "audiobook";

  for (const { library, formats } of results) {
    for (const value of formats) {
      if (!best || better(value, best.value)) {
        best = { value, libraryName: library.name };
      }
    }
  }
  if (!best) return { kind: "none" };

  const { value, libraryName } = best;
  if (value.status === "available") {
    return { kind: "available", format: value.format, libraryName };
  }
  if (value.estimatedWaitDays !== null) {
    return {
      kind: "wait",
      format: value.format,
      libraryName,
      days: value.estimatedWaitDays,
    };
  }
  return { kind: "waitlist", format: value.format, libraryName };
}
