import "server-only";
import { generateInviteCode, isWellFormedInviteCode } from "@/lib/invite-code";
import type { Db } from "./db";

export interface InviteDetails {
  bookClubId: string;
  bookClubName: string;
  bookClubDescription: string | null;
}

/** The club an invite code joins, or null if it's unknown, inactive or expired. */
export async function getInviteDetails(
  db: Db,
  code: string
): Promise<InviteDetails | null> {
  if (!isWellFormedInviteCode(code)) return null;

  const { data: invite, error } = await db
    .from("invite_links")
    .select("is_active, expires_at, book_clubs!inner (id, name, description)")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  if (!invite?.is_active) return null;
  if (invite.expires_at && new Date(invite.expires_at) < new Date())
    return null;

  return {
    bookClubId: invite.book_clubs.id,
    bookClubName: invite.book_clubs.name,
    bookClubDescription: invite.book_clubs.description,
  };
}

const MAX_CODE_ATTEMPTS = 10;

/** The club's active non-expiring invite code, creating one if needed. */
export async function getOrCreateInviteCode(
  db: Db,
  bookClubId: string,
  createdBy: string
): Promise<string> {
  const { data: existing, error } = await db
    .from("invite_links")
    .select("code")
    .eq("book_club_id", bookClubId)
    .eq("is_active", true)
    .is("expires_at", null)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing.code;

  let code = generateInviteCode();
  for (let attempt = 1; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const { data: taken, error: takenError } = await db
      .from("invite_links")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (takenError) throw takenError;
    if (!taken) break;
    code = generateInviteCode();
  }

  const { data: created, error: createError } = await db
    .from("invite_links")
    .insert({ book_club_id: bookClubId, code, created_by: createdBy })
    .select("code")
    .single();
  if (createError) throw createError;
  return created.code;
}

export async function deactivateInvite(
  db: Db,
  bookClubId: string,
  code: string
): Promise<void> {
  const { error } = await db
    .from("invite_links")
    .update({ is_active: false })
    .eq("code", code)
    .eq("book_club_id", bookClubId);
  if (error) throw error;
}
