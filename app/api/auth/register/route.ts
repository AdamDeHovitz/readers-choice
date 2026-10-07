import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  hashPassword,
  MAX_PASSWORD_BYTES,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
} from "@/lib/password";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const {
    email: rawEmail,
    password,
    name,
  } = (body ?? {}) as Record<string, unknown>;

  if (
    typeof rawEmail !== "string" ||
    typeof password !== "string" ||
    typeof name !== "string" ||
    !rawEmail.trim() ||
    !name.trim()
  ) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return Response.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 }
    );
  }

  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return Response.json({ error: "Password is too long" }, { status: 400 });
  }

  const email = normalizeEmail(rawEmail);

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
    .maybeSingle();

  if (existing) {
    return Response.json(
      { error: "Email already registered" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const { error } = await supabase
    .from("users")
    .insert({
      email,
      name: name.trim(),
      password_hash: passwordHash,
      google_id: null,
    })
    .select("id")
    .single();

  if (error) {
    return Response.json({ error: "Registration failed" }, { status: 500 });
  }

  return Response.json({ success: true });
}
