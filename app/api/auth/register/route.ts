import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  hashPassword,
  MAX_PASSWORD_BYTES,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
} from "@/lib/password";
import {
  consumeRateLimit,
  getClientIp,
  type RateLimitRule,
} from "@/lib/rate-limit";

const IP_RULE: RateLimitRule = {
  scope: "register:ip",
  limit: 10,
  windowSeconds: 15 * 60,
};

const EMAIL_RULE: RateLimitRule = {
  scope: "register:email",
  limit: 5,
  windowSeconds: 60 * 60,
};

// Deliberately the same message whether or not the email is already in use.
const REGISTRATION_REJECTED =
  "Could not register with these details. If you already have an account, try signing in.";

function tooManyRequests() {
  return Response.json(
    { error: "Too many attempts. Please try again later." },
    { status: 429 }
  );
}

export async function POST(req: Request) {
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

  // Rate limit before looking at the body so every request counts.
  if (!(await consumeRateLimit(supabase, IP_RULE, getClientIp(req.headers)))) {
    return tooManyRequests();
  }

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

  const email = normalizeEmail(rawEmail);

  if (!(await consumeRateLimit(supabase, EMAIL_RULE, email))) {
    return tooManyRequests();
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

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return Response.json({ error: REGISTRATION_REJECTED }, { status: 400 });
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
    // Unique violation: a concurrent request registered the same email.
    if (error.code === "23505") {
      return Response.json({ error: REGISTRATION_REJECTED }, { status: 400 });
    }
    return Response.json({ error: "Registration failed" }, { status: 500 });
  }

  return Response.json({ success: true });
}
