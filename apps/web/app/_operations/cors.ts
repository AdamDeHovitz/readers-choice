import "server-only";

/**
 * CORS for /api/v1, so the mobile app's web build (and any non-browser-native
 * client running in a browser) can call it from another origin.
 *
 * Safe because no credentials are allowed: with "*" and no
 * Access-Control-Allow-Credentials, a browser never attaches cookies to a
 * cross-origin request or exposes a cookie-authenticated response. Callers
 * authenticate with a bearer token instead, which a third-party page can't
 * obtain. Cookie-authenticated requests still have to come from this site
 * (see handleOperationRequest).
 */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

/** The response to a CORS preflight (OPTIONS). */
export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** A JSON response with the CORS headers. */
export function corsJson(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: CORS_HEADERS });
}
