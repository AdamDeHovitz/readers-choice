import { buildClubCalendar } from "@readers-choice/core/club-calendar";
import { getClubFeed } from "@/server/calendar";
import { createAdminClient } from "@/server/db";

// A member's subscribable calendar feed. Calendar apps fetch it without a
// session, so the secret token in the URL authorizes the request; see
// server/calendar.ts.
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  // Links end in ".ics", which some calendar apps look for.
  const token = (await params).token.replace(/\.ics$/, "");

  let feed;
  try {
    feed = await getClubFeed(createAdminClient(), token);
  } catch (error) {
    console.error("Calendar feed failed:", error);
    // A temporary error, so calendar apps keep the events they already have.
    return new Response("Calendar temporarily unavailable", {
      status: 503,
      headers: { "Retry-After": "300" },
    });
  }

  // Same response for unknown tokens and former members: reveal nothing.
  if (!feed) return new Response("Not found", { status: 404 });

  const body = buildClubCalendar({
    clubName: feed.clubName,
    meetings: feed.meetings,
    baseUrl: new URL(request.url).origin,
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="book-club.ics"',
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
