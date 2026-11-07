import type { SupabaseClient } from "@supabase/supabase-js";

// Read the current database role rather than trusting a potentially stale JWT.
export async function isSuperAdmin(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("is_super_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data?.is_super_admin === true;
}
