import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getBookClubDetails } from "@/app/actions/book-clubs";
import { getUpcomingMeeting } from "@/app/actions/meetings";
import { BookClubNav } from "@/components/navigation/book-club-nav";
import { NominationForm } from "@/components/nominations/nomination-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, SparklesIcon } from "lucide-react";

export default async function NominatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user) {
    redirect("/login");
  }

  const [bookClub, upcomingMeeting] = await Promise.all([
    getBookClubDetails(id),
    getUpcomingMeeting(id),
  ]);

  if (!bookClub) {
    redirect("/dashboard");
  }

  // If no upcoming meeting, show message instead of redirecting
  if (!upcomingMeeting) {
    return (
      <div className="bg-cream-100 min-h-screen">
        <BookClubNav
          bookClubId={id}
          bookClubName={bookClub.name}
          userName={session.user.name || "User"}
        />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Card>
            <CardHeader>
              <CardTitle className="font-inria text-dark-900 text-2xl font-bold">
                No Upcoming Meeting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-dark-600">
                There is no upcoming meeting scheduled. Nominations will be
                available once a meeting is scheduled.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const meetingDate = new Date(upcomingMeeting.meeting_date);
  const nominationDeadline = upcomingMeeting.nomination_deadline
    ? new Date(upcomingMeeting.nomination_deadline)
    : null;

  // Check if nomination deadline has passed
  const now = new Date();
  const nominationsClosed = nominationDeadline && nominationDeadline < now;

  // Transform bookOptions from Supabase array format to expected format
  const existingNominations = (upcomingMeeting.bookOptions || []).map(
    (option: any) => ({
      id: option.id,
      book: {
        id: option.book[0]?.id || "",
        title: option.book[0]?.title || "",
        author: option.book[0]?.author || "",
        cover_url: option.book[0]?.cover_url || null,
      },
      added_by: option.added_by,
    })
  );

  return (
    <div className="bg-cream-100 min-h-screen">
      <BookClubNav
        bookClubId={id}
        bookClubName={bookClub.name}
        userName={session.user.name || "User"}
      />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Nominations Closed Warning */}
          {nominationsClosed && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="font-semibold text-yellow-800">
                Nomination period has ended
              </p>
              <p className="mt-1 text-sm text-yellow-700">
                The deadline for nominations has passed. You can view the
                nominated books below, but cannot add new nominations.
              </p>
            </div>
          )}

          {/* Meeting Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="font-inria text-dark-900 text-2xl font-bold">
                {nominationsClosed ? "Nominated Books" : "Nominate a Book"}
              </CardTitle>
              <div className="text-dark-600 mt-2 space-y-2">
                {upcomingMeeting.theme &&
                  Array.isArray(upcomingMeeting.theme) &&
                  upcomingMeeting.theme[0]?.name && (
                    <div className="flex items-center gap-2">
                      <SparklesIcon className="h-4 w-4" />
                      <span className="font-semibold">
                        Theme: {upcomingMeeting.theme[0].name}
                      </span>
                    </div>
                  )}
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>
                    {meetingDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {nominationDeadline && !nominationsClosed && (
                  <p className="text-dark-500 text-sm">
                    Nominations close{" "}
                    {nominationDeadline.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
                {nominationDeadline && nominationsClosed && (
                  <p className="text-dark-500 text-sm">
                    Nominations closed{" "}
                    {nominationDeadline.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Nomination Form */}
          {!nominationsClosed && (
            <Card>
              <CardHeader>
                <CardTitle className="font-inria text-dark-900 text-xl">
                  Search for Books
                </CardTitle>
                <p className="text-dark-600 mt-2 text-sm">
                  Search for a book using Google Books and nominate it for this
                  meeting.
                </p>
              </CardHeader>
              <CardContent>
                <NominationForm
                  meetingId={upcomingMeeting.id}
                  existingNominations={existingNominations}
                />
              </CardContent>
            </Card>
          )}

          {/* Show only nominated books when nominations are closed */}
          {nominationsClosed &&
            upcomingMeeting.bookOptions &&
            upcomingMeeting.bookOptions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-inria text-dark-900 text-xl">
                    Nominated Books
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {upcomingMeeting.bookOptions.map((nomination: any) => (
                      <div
                        key={nomination.id}
                        className="border-gold-200 flex items-center gap-4 rounded-lg border p-3"
                      >
                        {nomination.book.cover_url && (
                          <img
                            src={nomination.book.cover_url}
                            alt={nomination.book.title}
                            className="h-24 w-16 rounded object-cover"
                          />
                        )}
                        <div>
                          <h3 className="text-dark-900 font-semibold">
                            {nomination.book.title}
                          </h3>
                          <p className="text-dark-600 text-sm">
                            {nomination.book.author}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      </main>
    </div>
  );
}
