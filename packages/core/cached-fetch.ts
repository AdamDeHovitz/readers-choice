/**
 * `fetch` options plus Next.js's data-cache hint. On the web server, Next
 * caches the response for `revalidate` seconds; other runtimes ignore it.
 * Declared here so core doesn't depend on Next's global types.
 */
export type CachedRequestInit = RequestInit & {
  next?: { revalidate?: number };
};

/** Types `fetch` options that carry Next's cache hint. */
export function cachedInit(init: CachedRequestInit): RequestInit {
  return init;
}
