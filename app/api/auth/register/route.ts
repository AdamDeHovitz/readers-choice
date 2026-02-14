import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { hashPassword } from "@/lib/password";

export async function POST(req: Request) {
  const { email, password, name } = await req.json();

  if (!email || !password || !name) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  if (password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

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

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    return Response.json(
      { error: "Email already registered" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const { error } = await supabase
    .from("users")
    .insert({ email, name, password_hash: passwordHash, google_id: null })
    .select("id")
    .single();

  if (error) {
    return Response.json({ error: "Registration failed" }, { status: 500 });
  }

  return Response.json({ success: true });
}
