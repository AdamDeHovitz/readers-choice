import "server-only";
import { OAUTH_SCOPES } from "@readers-choice/core/oauth";
import { createAdminClient } from "@/server/db";
import {
  exchangeAuthorizationCode,
  refreshAccessToken,
} from "@/server/oauth/authorization";
import { registerClient } from "@/server/oauth/clients";
import { oauthUrls, siteOrigin } from "@/server/oauth/config";
import {
  ClientRegistrationError,
  OAuthTokenError,
} from "@/server/oauth/errors";
import {
  consumeRateLimit,
  getClientIp,
  type RateLimitRule,
} from "@/server/rate-limit";

/**
 * The OAuth authorization server's HTTP endpoints for the MCP server:
 * metadata (RFC 8414, RFC 9728), the token endpoint and Dynamic Client
 * Registration (RFC 7591). The consent screen is a page (app/oauth/).
 *
 * Everything here is called by apps, sometimes from a browser on another
 * origin, so responses allow any origin and never credentials. No cookies
 * are read.
 */

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, MCP-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};

export function oauthPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * Never cached, metadata included: it names this deployment's origin, and
 * no shared cache should hand one deployment's answer to another.
 */
function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { ...CORS, "Cache-Control": "no-store" },
  });
}

const oauthError = (error: string, description: string, status = 400) =>
  json({ error, error_description: description }, status);

const rule = (scope: string, limit: number, windowSeconds: number) =>
  ({ scope, limit, windowSeconds }) satisfies RateLimitRule;
const TOKEN_LIMIT = rule("oauth-token:ip", 120, 15 * 60);
const REGISTER_LIMIT = rule("oauth-register:ip", 10, 60 * 60);

/** GET /.well-known/oauth-authorization-server (RFC 8414). */
export function authorizationServerMetadata(request: Request): Response {
  const urls = oauthUrls(siteOrigin(request.headers));
  return json(
    {
      issuer: urls.issuer,
      authorization_endpoint: urls.authorization,
      token_endpoint: urls.token,
      registration_endpoint: urls.registration,
      response_types_supported: ["code"],
      response_modes_supported: ["query"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: OAUTH_SCOPES,
      client_id_metadata_document_supported: true,
      authorization_response_iss_parameter_supported: true,
    },
    200
  );
}

/** GET /.well-known/oauth-protected-resource[/api/mcp] (RFC 9728). */
export function protectedResourceMetadata(request: Request): Response {
  const urls = oauthUrls(siteOrigin(request.headers));
  return json(
    {
      resource: urls.resource,
      authorization_servers: [urls.issuer],
      scopes_supported: OAUTH_SCOPES,
      bearer_methods_supported: ["header"],
      resource_name: "Readers' Choice",
    },
    200
  );
}

/**
 * Form fields, refusing repeats (RFC 6749 §3.1: parameters must not be
 * sent more than once). Null if any field repeats.
 */
function formFields(form: URLSearchParams): Map<string, string> | null {
  const fields = new Map<string, string>();
  for (const [key, value] of form) {
    if (fields.has(key)) return null;
    fields.set(key, value);
  }
  return fields;
}

/** POST /api/oauth/token. */
export async function tokenEndpoint(request: Request): Promise<Response> {
  const db = createAdminClient();
  if (
    !(await consumeRateLimit(db, TOKEN_LIMIT, getClientIp(request.headers)))
  ) {
    return oauthError("slow_down", "Too many requests", 429);
  }
  const type = request.headers.get("content-type") ?? "";
  if (!/^application\/x-www-form-urlencoded\b/i.test(type)) {
    return oauthError(
      "invalid_request",
      "Send the request as application/x-www-form-urlencoded"
    );
  }
  // Public clients only: a client that tries to authenticate is refused.
  if (request.headers.has("authorization")) {
    return oauthError(
      "invalid_client",
      "Client authentication is not supported; use PKCE",
      401
    );
  }

  let fields: Map<string, string> | null;
  try {
    fields = formFields(new URLSearchParams(await request.text()));
  } catch {
    return oauthError("invalid_request", "Unreadable request body");
  }
  if (!fields) return oauthError("invalid_request", "Repeated parameter");
  const field = (name: string) => fields.get(name) ?? null;
  if (field("client_secret") !== null) {
    return oauthError(
      "invalid_client",
      "Client secrets are not supported",
      401
    );
  }

  const urls = oauthUrls(siteOrigin(request.headers));
  const clientId = field("client_id");
  if (!clientId) return oauthError("invalid_request", "Missing client_id");

  try {
    switch (field("grant_type")) {
      case "authorization_code": {
        const code = field("code");
        const redirectUri = field("redirect_uri");
        const codeVerifier = field("code_verifier");
        if (!code || !redirectUri || !codeVerifier) {
          return oauthError(
            "invalid_request",
            "code, redirect_uri and code_verifier are required"
          );
        }
        return json(
          await exchangeAuthorizationCode(
            db,
            {
              code,
              clientId,
              redirectUri,
              codeVerifier,
              resource: field("resource"),
            },
            urls
          ),
          200
        );
      }
      case "refresh_token": {
        const refreshToken = field("refresh_token");
        if (!refreshToken) {
          return oauthError("invalid_request", "refresh_token is required");
        }
        return json(
          await refreshAccessToken(
            db,
            {
              refreshToken,
              clientId,
              scope: field("scope"),
              resource: field("resource"),
            },
            urls
          ),
          200
        );
      }
      default:
        return oauthError(
          "unsupported_grant_type",
          "Use authorization_code or refresh_token"
        );
    }
  } catch (error) {
    if (error instanceof OAuthTokenError) {
      return oauthError(error.code, error.message);
    }
    console.error("OAuth token endpoint failed:", error);
    return oauthError("server_error", "Something went wrong", 500);
  }
}

/** POST /api/oauth/register (RFC 7591). */
export async function registrationEndpoint(
  request: Request
): Promise<Response> {
  const db = createAdminClient();
  if (
    !(await consumeRateLimit(db, REGISTER_LIMIT, getClientIp(request.headers)))
  ) {
    return oauthError("slow_down", "Too many registrations", 429);
  }
  if (
    !/^application\/json\b/i.test(request.headers.get("content-type") ?? "")
  ) {
    return oauthError("invalid_client_metadata", "Send JSON");
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return oauthError("invalid_client_metadata", "Invalid JSON");
  }
  try {
    return json(await registerClient(db, body), 201);
  } catch (error) {
    if (error instanceof ClientRegistrationError) {
      return oauthError(error.code, error.message);
    }
    console.error("OAuth client registration failed:", error);
    return oauthError("server_error", "Something went wrong", 500);
  }
}
