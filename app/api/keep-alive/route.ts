import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Supabase pauses free-tier projects after ~7 days without database activity.
// A Vercel Cron (see vercel.json) calls this daily to keep production and the
// staging project (used by PR previews) up. Staging is skipped if unset.
export const dynamic = "force-dynamic";

const projects = [
  {
    name: "production",
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  {
    name: "staging",
    url: process.env.STAGING_SUPABASE_URL,
    key: process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY,
  },
];

async function ping(url: string, key: string) {
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase
    .from("book_clubs")
    .select("id", { head: true, count: "exact" })
    .limit(1);
  return error;
}

export async function GET(request: Request) {
  // Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const results: Record<string, boolean> = {};
  for (const { name, url, key } of projects) {
    if (!url || !key) continue;
    const error = await ping(url, key);
    if (error) console.error(`keep-alive query failed (${name})`, error);
    results[name] = !error;
  }

  const ok = Object.values(results).every(Boolean);
  return NextResponse.json({ ok, ...results }, { status: ok ? 200 : 500 });
}
