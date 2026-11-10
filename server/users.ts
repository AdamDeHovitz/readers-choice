import "server-only";
import { normalizeEmail } from "@/lib/password";
import type { Db } from "./db";

export interface Account {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  googleId: string | null;
  passwordHash: string | null;
}

/** Look up a user by email (normalized), or null if there's no account. */
export async function findAccountByEmail(
  db: Db,
  email: string
): Promise<Account | null> {
  const { data, error } = await db
    .from("users")
    .select("id, email, name, avatar_url, google_id, password_hash")
    .eq("email", normalizeEmail(email))
    .maybeSingle();
  if (error) throw error;
  return data
    ? {
        id: data.id,
        email: data.email,
        name: data.name,
        avatarUrl: data.avatar_url,
        googleId: data.google_id,
        passwordHash: data.password_hash,
      }
    : null;
}

/**
 * Create or update the account for a Google sign-in.
 *
 * On the first Google sign-in for an account created with a password, Google
 * has now proven ownership of the email, but the password was set without
 * verification and may belong to someone who pre-registered this address.
 * Drop it so only the verified owner keeps access.
 */
export async function upsertGoogleAccount(
  db: Db,
  profile: {
    email: string;
    name: string;
    image: string | null;
    googleId: string;
  }
): Promise<void> {
  const email = normalizeEmail(profile.email);
  const existing = await findAccountByEmail(db, email);

  if (!existing) {
    const { error } = await db.from("users").insert({
      email,
      name: profile.name,
      avatar_url: profile.image,
      google_id: profile.googleId,
    });
    if (error) throw error;
    return;
  }

  const linking = existing.googleId
    ? {}
    : { google_id: profile.googleId, password_hash: null };
  const { error } = await db
    .from("users")
    .update({ name: profile.name, avatar_url: profile.image, ...linking })
    .eq("id", existing.id);
  if (error) throw error;
}
