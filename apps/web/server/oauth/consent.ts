import "server-only";
import { headers } from "next/headers";
import {
  chosenScopes,
  formatScope,
  parseScope,
} from "@readers-choice/core/oauth";
import type { Viewer } from "../viewer";
import {
  checkAuthorizationRequest,
  type AuthorizationCheck,
  type AuthorizationRequest,
} from "./authorization";
import { oauthUrls, siteOrigin, type OAuthUrls } from "./config";

/**
 * Glue for the consent screen (app/oauth/authorize/): the page and its
 * server action both check the same raw query string, so a request the
 * page showed is re-checked in full when the user decides.
 */

type Params = Record<string, string | string[] | undefined>;

/** A query string as page searchParams look: repeated keys become arrays. */
export function paramsFromQuery(query: string): Params {
  const params: Params = {};
  for (const [key, value] of new URLSearchParams(query)) {
    const existing = params[key];
    params[key] =
      existing === undefined
        ? value
        : [...(Array.isArray(existing) ? existing : [existing]), value];
  }
  return params;
}

/** searchParams back to a query string, keeping repeats. */
export function queryFromParams(params: Params): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : value ? [value] : []) {
      query.append(key, v);
    }
  }
  return query.toString();
}

export async function requestUrls(): Promise<OAuthUrls> {
  return oauthUrls(siteOrigin(await headers()));
}

export async function checkConsentRequest(
  viewer: Viewer,
  params: Params
): Promise<{ check: AuthorizationCheck; urls: OAuthUrls }> {
  const urls = await requestUrls();
  const check = await checkAuthorizationRequest(
    viewer.db,
    params,
    urls,
    viewer.userId
  );
  return { check, urls };
}

/** The request with only the scopes the user allowed on the consent screen. */
export function withChosenScope(
  request: AuthorizationRequest,
  allowed: { write: boolean; admin: boolean }
): AuthorizationRequest {
  const scopes = chosenScopes(parseScope(request.scope), allowed);
  return { ...request, scope: formatScope(scopes) };
}
