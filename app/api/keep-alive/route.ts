import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Supabase pauses free-tier projects after ~7 days without database activity.
// A Vercel Cron (see vercel.json) calls this daily so the project stays up.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await supabase
    .from("book_clubs")
    .select("id", { head: true, count: "exact" })
    .limit(1);

  if (error) {
    console.error("keep-alive query failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
