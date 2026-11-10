import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/** A Supabase client typed against our schema (see `npm run db:types`). */
export type Db = SupabaseClient<Database>;

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

/**
 * The service-role client. It bypasses RLS (there are no policies), so every
 * caller is responsible for authorization; see server/authz.ts.
 */
export function createAdminClient(): Db {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
