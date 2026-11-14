import "server-only";
import { randomUUID } from "crypto";
import { z } from "zod";
import type { Db } from "../db";
import { consumeRateLimit, type RateLimitRule } from "../rate-limit";
import {
  fetchClientMetadataDocument,
  isClientMetadataDocumentUrl,
} from "./client-metadata";
import { ClientRegistrationError } from "./errors";
import { clientName, redirectUris } from "./schemas";

/**
 * OAuth clients: the apps that may ask a user for access. Two ways in:
 *
 * - Client ID Metadata Documents (the MCP spec's preferred way): the
 *   client_id is an HTTPS URL serving the client's metadata. We fetch it
 *   (client-metadata.ts) and cache it here.
 * - Dynamic Client Registration (RFC 7591, deprecated by MCP but still what
 *   most clients use): anyone may register, so a registration proves
 *   nothing about who the app is. The consent screen says so.
 *
 * Every client is public (no secret): PKCE protects the code exchange.
 */

export interface OAuthClient {
  id: string;
  kind: "registered" | "metadata_document";
  name: string;
  redirectUris: string[];
}

/** Refetch a metadata document when the cached copy is older than this. */
const METADATA_MAX_AGE_MS = 60 * 60 * 1000;

/** Metadata documents one user may make us fetch (cache hits are free). */
const METADATA_FETCH_LIMIT: RateLimitRule = {
  scope: "oauth-cimd-fetch:user",
  limit: 20,
  windowSeconds: 60 * 60,
};

/** The RFC 7591 request fields we act on; anything else is ignored. */
const registrationRequest = z.object({
  redirect_uris: redirectUris,
  client_name: clientName.optional(),
  grant_types: z
    .array(z.enum(["authorization_code", "refresh_token"]))
    .optional(),
  response_types: z.array(z.literal("code")).optional(),
});

/** Register a public client (RFC 7591). Returns the RFC 7591 response. */
export async function registerClient(
  db: Db,
  body: unknown,
  now = new Date()
): Promise<Record<string, unknown>> {
  const parsed = registrationRequest.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ClientRegistrationError(
      issue?.path[0] === "redirect_uris"
        ? "invalid_redirect_uri"
        : "invalid_client_metadata",
      issue?.message ?? "Invalid client metadata"
    );
  }
  const request = parsed.data;
  const name =
    request.client_name ?? new URL(request.redirect_uris[0]).hostname;
  const id = randomUUID();

  const { error } = await db.from("oauth_clients").insert({
    id,
    kind: "registered",
    client_name: name,
    redirect_uris: request.redirect_uris,
    created_at: now.toISOString(),
  });
  if (error) throw error;

  return {
    client_id: id,
    client_id_issued_at: Math.floor(now.getTime() / 1000),
    client_name: name,
    redirect_uris: request.redirect_uris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  };
}

/**
 * The client a client_id names, or null if there's no such client. A
 * metadata-document client is fetched (or refetched when stale) and cached;
 * a document that can't be fetched or is invalid means null.
 */
export async function findClient(
  db: Db,
  clientId: string,
  /** Who's asking: metadata fetches are rate-limited per user. */
  requesterId: string,
  now = new Date()
): Promise<OAuthClient | null> {
  if (clientId.length > 512) return null;
  const { data, error } = await db
    .from("oauth_clients")
    .select("id, kind, client_name, redirect_uris, metadata_fetched_at")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw error;

  if (!isClientMetadataDocumentUrl(clientId)) {
    if (!data || data.kind !== "registered") return null;
    return toClient(data);
  }

  const fresh =
    data?.metadata_fetched_at &&
    now.getTime() - Date.parse(data.metadata_fetched_at) < METADATA_MAX_AGE_MS;
  if (data && fresh) return toClient(data);

  if (!(await consumeRateLimit(db, METADATA_FETCH_LIMIT, requesterId))) {
    return null;
  }
  const document = await fetchClientMetadataDocument(clientId);
  if (!document) return null;
  const { error: upsertError } = await db.from("oauth_clients").upsert({
    id: clientId,
    kind: "metadata_document",
    client_name: document.clientName,
    redirect_uris: document.redirectUris,
    metadata_fetched_at: now.toISOString(),
  });
  if (upsertError) throw upsertError;
  return {
    id: clientId,
    kind: "metadata_document",
    name: document.clientName,
    redirectUris: document.redirectUris,
  };
}

function toClient(row: {
  id: string;
  kind: string;
  client_name: string;
  redirect_uris: string[];
}): OAuthClient {
  return {
    id: row.id,
    kind: row.kind === "metadata_document" ? "metadata_document" : "registered",
    name: row.client_name,
    redirectUris: row.redirect_uris,
  };
}
