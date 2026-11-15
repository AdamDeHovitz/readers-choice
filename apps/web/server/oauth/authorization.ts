import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import {
  CODE_CHALLENGE_PATTERN,
  CODE_VERIFIER_PATTERN,
  formatScope,
  grantableScopes,
  isLoopbackRedirect,
  parseScope,
  redirectUriMatches,
} from "@readers-choice/core/oauth";
import type { Db } from "../db";
import { hashToken, newOpaqueToken } from "../tokens";
import { signAccessToken } from "./access-tokens";
import { findClient, type OAuthClient } from "./clients";
import { CODE_TTL_SECONDS, type OAuthUrls } from "./config";
import { OAuthTokenError } from "./errors";
import { createGrant, revokeGrantById, rotateGrant } from "./grants";

/**
 * The authorization code flow with PKCE (OAuth 2.1 §4.1): checking an
 * authorization request, issuing a code once the user approves, and the
 * token endpoint's two grants (authorization_code and refresh_token).
 */

type Params = Record<string, string | string[] | undefined>;

/** An authorization request that passed every check. */
export interface AuthorizationRequest {
  client: OAuthClient;
  redirectUri: string;
  state: string | null;
  codeChallenge: string;
  scope: string;
  resource: string;
}

export type AuthorizationCheck =
  | { kind: "ok"; request: AuthorizationRequest }
  /**
   * The client or redirect URI can't be trusted, so the error is shown to
   * the user instead of being sent to the redirect URI (RFC 6749 §4.1.2.1).
   */
  | { kind: "invalid"; message: string }
  /**
   * A well-formed client and redirect URI, but a bad request otherwise. The
   * error belongs at the redirect URI, but the page shows it with a link
   * there instead of redirecting: anyone can register a redirect URI, so an
   * automatic redirect would make this an open redirector (RFC 9700
   * §4.11.2).
   */
  | { kind: "error"; message: string; location: string };

/** One value per parameter: repeating one is an invalid request. */
function single(params: Params, name: string): string | null | undefined {
  const value = params[name];
  if (Array.isArray(value)) return undefined;
  return value ?? null;
}

export async function checkAuthorizationRequest(
  db: Db,
  params: Params,
  urls: OAuthUrls,
  /** The signed-in user looking at the consent screen. */
  userId: string
): Promise<AuthorizationCheck> {
  const clientId = single(params, "client_id");
  if (!clientId) return { kind: "invalid", message: "Missing client_id." };
  const client = await findClient(db, clientId, userId);
  if (!client) {
    return { kind: "invalid", message: "This app isn't registered." };
  }

  const redirectUri = single(params, "redirect_uri");
  if (
    !redirectUri ||
    !client.redirectUris.some((registered) =>
      redirectUriMatches(registered, redirectUri)
    )
  ) {
    return {
      kind: "invalid",
      message: "The app sent a redirect address it didn't register.",
    };
  }

  const state = single(params, "state");
  const fail = (error: string, description: string): AuthorizationCheck => ({
    kind: "error",
    message: description,
    location: redirectLocation(redirectUri, urls.issuer, state ?? null, {
      error,
      error_description: description,
    }),
  });

  if (state === undefined || (state && state.length > 1024)) {
    return fail("invalid_request", "Invalid state");
  }
  const responseType = single(params, "response_type");
  if (responseType !== "code") {
    return fail("unsupported_response_type", "Only response_type=code");
  }
  const challenge = single(params, "code_challenge");
  if (!challenge || !CODE_CHALLENGE_PATTERN.test(challenge)) {
    return fail("invalid_request", "PKCE code_challenge is required");
  }
  if (single(params, "code_challenge_method") !== "S256") {
    return fail("invalid_request", "code_challenge_method must be S256");
  }
  const resource = single(params, "resource");
  if (resource === undefined || (resource && resource !== urls.resource)) {
    return fail("invalid_target", `The only resource is ${urls.resource}`);
  }
  const scope = single(params, "scope");
  if (scope === undefined) return fail("invalid_scope", "Invalid scope");

  return {
    kind: "ok",
    request: {
      client,
      redirectUri,
      state,
      codeChallenge: challenge,
      scope: formatScope(grantableScopes(scope)),
      resource: urls.resource,
    },
  };
}

/** The redirect back to the client, with `iss` (RFC 9207) and `state`. */
function redirectLocation(
  redirectUri: string,
  issuer: string,
  state: string | null,
  values: Record<string, string>
): string {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(values)) {
    url.searchParams.set(key, value);
  }
  if (state) url.searchParams.set("state", state);
  url.searchParams.set("iss", issuer);
  return url.href;
}

/** Whether the redirect goes to an app on the user's own device. */
export function redirectsToThisDevice(request: AuthorizationRequest): boolean {
  return isLoopbackRedirect(new URL(request.redirectUri));
}

/** The user said no: send the client access_denied. */
export function denialLocation(
  request: AuthorizationRequest,
  urls: OAuthUrls
): string {
  return redirectLocation(request.redirectUri, urls.issuer, request.state, {
    error: "access_denied",
    error_description: "The user declined",
  });
}

/** The user approved: store a single-use code and redirect with it. */
export async function approveAuthorization(
  db: Db,
  userId: string,
  request: AuthorizationRequest,
  urls: OAuthUrls,
  now = new Date()
): Promise<string> {
  const code = newOpaqueToken();
  const { error } = await db.from("oauth_authorization_codes").insert({
    code_hash: hashToken(code),
    client_id: request.client.id,
    user_id: userId,
    redirect_uri: request.redirectUri,
    code_challenge: request.codeChallenge,
    scope: request.scope,
    resource: request.resource,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + CODE_TTL_SECONDS * 1000).toISOString(),
  });
  if (error) throw error;
  return redirectLocation(request.redirectUri, urls.issuer, request.state, {
    code,
  });
}

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

function pkceMatches(verifier: string, challenge: string): boolean {
  const computed = Buffer.from(
    createHash("sha256").update(verifier).digest("base64url")
  );
  const expected = Buffer.from(challenge);
  return (
    computed.length === expected.length && timingSafeEqual(computed, expected)
  );
}

/** grant_type=authorization_code. */
export async function exchangeAuthorizationCode(
  db: Db,
  input: {
    code: string;
    clientId: string;
    redirectUri: string;
    codeVerifier: string;
    resource: string | null;
  },
  urls: OAuthUrls,
  now = new Date()
): Promise<TokenResponse> {
  if (!CODE_VERIFIER_PATTERN.test(input.codeVerifier)) {
    throw new OAuthTokenError("invalid_request", "Invalid code_verifier");
  }
  if (input.resource !== null && input.resource !== urls.resource) {
    throw new OAuthTokenError("invalid_target", "Unknown resource");
  }
  const codeHash = hashToken(input.code);

  // Consume the code first (compare-and-swap), so it works at most once
  // even if the checks below fail.
  const { data: code, error } = await db
    .from("oauth_authorization_codes")
    .update({ consumed_at: now.toISOString() })
    .eq("code_hash", codeHash)
    .is("consumed_at", null)
    .gt("expires_at", now.toISOString())
    .select("client_id, user_id, redirect_uri, code_challenge, scope, resource")
    .maybeSingle();
  if (error) throw error;

  if (!code) {
    // A code used twice may have been stolen: revoke what it granted
    // (OAuth 2.1 §4.1.3).
    const { data: used, error: usedError } = await db
      .from("oauth_authorization_codes")
      .select("grant_id")
      .eq("code_hash", codeHash)
      .not("consumed_at", "is", null)
      .maybeSingle();
    if (usedError) throw usedError;
    if (used?.grant_id) await revokeGrantById(db, used.grant_id, now);
    throw new OAuthTokenError("invalid_grant", "The code is not valid");
  }

  if (
    code.client_id !== input.clientId ||
    code.redirect_uri !== input.redirectUri ||
    code.resource !== urls.resource ||
    !pkceMatches(input.codeVerifier, code.code_challenge)
  ) {
    throw new OAuthTokenError("invalid_grant", "The code is not valid");
  }

  const { grant, refreshToken } = await createGrant(
    db,
    {
      userId: code.user_id,
      clientId: code.client_id,
      scope: code.scope,
      resource: code.resource,
      redirectUri: code.redirect_uri,
    },
    now
  );
  const { error: linkError } = await db
    .from("oauth_authorization_codes")
    .update({ grant_id: grant.id })
    .eq("code_hash", codeHash);
  if (linkError) throw linkError;

  const access = await signAccessToken(
    {
      userId: grant.userId,
      clientId: grant.clientId,
      grantId: grant.id,
      scope: grant.scope,
    },
    urls,
    now
  );
  return {
    access_token: access.token,
    token_type: "Bearer",
    expires_in: access.expiresIn,
    refresh_token: refreshToken,
    scope: grant.scope,
  };
}

/** grant_type=refresh_token. */
export async function refreshAccessToken(
  db: Db,
  input: {
    refreshToken: string;
    clientId: string;
    scope: string | null;
    resource: string | null;
  },
  urls: OAuthUrls,
  now = new Date()
): Promise<TokenResponse> {
  if (input.resource !== null && input.resource !== urls.resource) {
    throw new OAuthTokenError("invalid_target", "Unknown resource");
  }
  const { grant, refreshToken } = await rotateGrant(
    db,
    input.refreshToken,
    input.clientId,
    urls.resource,
    now
  );

  // A refresh may ask for less than the grant allows (RFC 6749 §6), never more.
  const granted = parseScope(grant.scope);
  let scope = grant.scope;
  if (input.scope !== null) {
    const asked = input.scope.split(" ").filter(Boolean);
    if (asked.some((s) => !granted.includes(s as never))) {
      throw new OAuthTokenError("invalid_scope", "Scope exceeds the grant");
    }
    scope = formatScope(grantableScopes(input.scope));
  }

  const access = await signAccessToken(
    {
      userId: grant.userId,
      clientId: grant.clientId,
      grantId: grant.id,
      scope,
    },
    urls,
    now
  );
  return {
    access_token: access.token,
    token_type: "Bearer",
    expires_in: access.expiresIn,
    refresh_token: refreshToken,
    scope,
  };
}
