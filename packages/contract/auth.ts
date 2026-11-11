import { z } from "zod";

/**
 * Mobile sign-in (#75). Not operations: these run before there's a viewer,
 * at fixed routes under /api/v1/auth/. Each returns an ActionResult; the
 * token responses carry `Session`.
 *
 * The app sends `Authorization: Bearer <accessToken>` to /api/v1/<operation>.
 * When an operation returns `unauthenticated`, call refresh, then retry once.
 * Refresh one request at a time: each refresh replaces the refresh token, and
 * replaying a replaced token more than a minute later signs the device out.
 */

const deviceName = z.string().trim().max(100).optional();

export const passwordSignIn = z.object({
  email: z.string().trim().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
  deviceName,
});

/** An ID token from native Google Sign-In. */
export const googleSignIn = z.object({
  idToken: z.string().min(1),
  deviceName,
});

export const refreshSession = z.object({ refreshToken: z.string().min(1) });

export const signOut = z.object({ refreshToken: z.string().min(1) });

export type PasswordSignIn = z.input<typeof passwordSignIn>;
export type GoogleSignIn = z.input<typeof googleSignIn>;
export type RefreshSession = z.input<typeof refreshSession>;
export type SignOut = z.input<typeof signOut>;

export interface Session {
  /** Send as `Authorization: Bearer …`. Expires in minutes. */
  accessToken: string;
  /** ISO timestamp. Refresh shortly before this. */
  accessTokenExpiresAt: string;
  /** Store in the device keychain. Replaced on every refresh. */
  refreshToken: string;
  user: { id: string; name: string; email: string };
}

/** Paths, relative to the site origin. */
export const authPaths = {
  password: "/api/v1/auth/password",
  google: "/api/v1/auth/google",
  refresh: "/api/v1/auth/refresh",
  signOut: "/api/v1/auth/sign-out",
} as const;
