import { auth } from "@/auth";
import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
import { Session } from "next-auth";

type ActionResponse<T> = Promise<
  | { success: true; data: T }
  | { success: false; error: string }
>;

type AuthenticatedActionFunction<T> = (params: {
  session: Session;
  supabase: SupabaseClient;
}) => Promise<T>;

/**
 * A safe wrapper for server actions that require authentication.
 * It handles:
 * 1. Authentication check (NextAuth)
 * 2. Supabase Admin Client initialization
 * 3. Error handling
 */
export async function authenticatedAction<T>(
  action: AuthenticatedActionFunction<T>
): ActionResponse<T> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const data = await action({ session, supabase });
    return { success: true, data };
  } catch (error: any) {
    console.error("Action error:", error);
    return { 
      success: false, 
      error: error.message || "An unexpected error occurred" 
    };
  }
}

/**
 * For public actions that don't strictly require a user session,
 * but still need the admin client to bypass RLS for public read operations.
 * (e.g. browsing book clubs)
 */
export async function publicAction<T>(
  action: (params: { session: Session | null; supabase: SupabaseClient }) => Promise<T>
): ActionResponse<T> {
  const session = await auth();

  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const data = await action({ session, supabase });
    return { success: true, data };
  } catch (error: any) {
    console.error("Public action error:", error);
    return { 
      success: false, 
      error: error.message || "An unexpected error occurred" 
    };
  }
}
