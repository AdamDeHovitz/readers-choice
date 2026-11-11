import "server-only";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

/**
 * Verifies ID tokens from native Google Sign-In on the mobile app. The
 * audience must be one of our app's OAuth client IDs, listed comma-separated
 * in GOOGLE_MOBILE_CLIENT_IDS (iOS and Android clients, plus the web client
 * if the app requests tokens for it).
 */

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const GOOGLE_KEYS = new URL("https://www.googleapis.com/oauth2/v3/certs");

let remoteKeys: JWTVerifyGetKey | undefined;

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  image: string | null;
}

export function mobileGoogleClientIds(): string[] {
  return (process.env.GOOGLE_MOBILE_CLIENT_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

/**
 * The profile in a valid Google ID token with a verified email, or null.
 * `keys` and `audiences` are injectable for tests.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  {
    keys = (remoteKeys ??= createRemoteJWKSet(GOOGLE_KEYS)),
    audiences = mobileGoogleClientIds(),
  }: { keys?: JWTVerifyGetKey; audiences?: string[] } = {}
): Promise<GoogleProfile | null> {
  if (audiences.length === 0) return null;
  try {
    const { payload } = await jwtVerify(idToken, keys, {
      issuer: GOOGLE_ISSUERS,
      audience: audiences,
      algorithms: ["RS256"],
    });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      payload.email_verified !== true
    ) {
      return null;
    }
    const name =
      typeof payload.name === "string" && payload.name.trim()
        ? payload.name
        : payload.email.split("@")[0];
    return {
      googleId: payload.sub,
      email: payload.email,
      name,
      image: typeof payload.picture === "string" ? payload.picture : null,
    };
  } catch {
    return null;
  }
}
