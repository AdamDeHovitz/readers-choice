import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { derivedKey } from "../tokens";
import { ACCESS_TOKEN_SECONDS } from "./config";

/**
 * MCP access tokens: HS256 JWTs whose audience is the MCP server URL they
 * were issued for (RFC 8707), signed with a key of their own, so neither a
 * mobile token nor a token for another deployment verifies here, and these
 * never verify at /api/v1. `gid` names the grant, which the resource server
 * checks on every request.
 */

const KEY_PURPOSE = "mcp-access-token";

export interface AccessTokenClaims {
  userId: string;
  clientId: string;
  grantId: string;
  scope: string;
  expiresAt: number;
}

export async function signAccessToken(
  claims: Omit<AccessTokenClaims, "expiresAt">,
  audience: { issuer: string; resource: string },
  now = new Date()
): Promise<{ token: string; expiresIn: number }> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const token = await new SignJWT({
    client_id: claims.clientId,
    gid: claims.grantId,
    scope: claims.scope,
  })
    .setProtectedHeader({ alg: "HS256", typ: "at+jwt" })
    .setSubject(claims.userId)
    .setIssuer(audience.issuer)
    .setAudience(audience.resource)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ACCESS_TOKEN_SECONDS)
    .sign(derivedKey(KEY_PURPOSE));
  return { token, expiresIn: ACCESS_TOKEN_SECONDS };
}

/** The claims of a valid, unexpired token for this audience, or null. */
export async function verifyAccessToken(
  token: string,
  audience: { issuer: string; resource: string }
): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, derivedKey(KEY_PURPOSE), {
      issuer: audience.issuer,
      audience: audience.resource,
      algorithms: ["HS256"],
      typ: "at+jwt",
    });
    const { sub, client_id, gid, scope, exp } = payload;
    if (
      typeof sub !== "string" ||
      typeof client_id !== "string" ||
      typeof gid !== "string" ||
      typeof scope !== "string" ||
      typeof exp !== "number"
    ) {
      return null;
    }
    return {
      userId: sub,
      clientId: client_id,
      grantId: gid,
      scope,
      expiresAt: exp,
    };
  } catch {
    return null;
  }
}
