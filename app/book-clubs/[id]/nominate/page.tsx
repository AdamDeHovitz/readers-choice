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
      <div className="min-h-screen bg-cream-100">
        <BookClubNav
          bookClubId={id}
          bookClubName={bookClub.name}
          userName={session.user.name || "User"}
        />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold font-inria text-dark-900">
                No Upcoming Meeting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-dark-600">
                There is no upcoming meeting scheduled. Nominations will be available
                once a meeting is scheduled.
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

  return (
    <div className="min-h-screen bg-cream-100">
      <BookClubNav
        bookClubId={id}
        bookClubName={bookClub.name}
        userName={session.user.name || "User"}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Nominations Closed Warning */}
          {nominationsClosed && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 font-semibold">
                Nomination period has ended
              </p>
              <p className="text-yellow-700 text-sm mt-1">
                The deadline for nominations has passed. You can view the
                nominated books below, but cannot add new nominations.
              </p>
            </div>
          )}

          {/* Meeting Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold font-inria text-dark-900">
                {nominationsClosed ? "Nominated Books" : "Nominate a Book"}
              </CardTitle>
              <div className="space-y-2 text-dark-600 mt-2">
                {upcomingMeeting.theme && (
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="h-4 w-4" />
                    <span className="font-semibold">
                      Theme: {upcomingMeeting.theme.name}
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
                  <p className="text-sm text-dark-500">
                    Nominations close{" "}
                    {nominationDeadline.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
                {nominationDeadline && nominationsClosed && (
                  <p className="text-sm text-dark-500">
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
                <CardTitle className="text-xl font-inria text-dark-900">
                  Search for Books
                </CardTitle>
                <p className="text-sm text-dark-600 mt-2">
                  Search for a book using Google Books and nominate it for this
                  meeting.
                </p>
              </CardHeader>
              <CardContent>
                <NominationForm
                  meetingId={upcomingMeeting.id}
                  bookClubId={id}
                  existingNominations={upcomingMeeting.bookOptions || []}
                />
              </CardContent>
            </Card>
          )}

          {/* Show only nominated books when nominations are closed */}
          {nominationsClosed && upcomingMeeting.bookOptions && upcomingMeeting.bookOptions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-inria text-dark-900">
                  Nominated Books
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcomingMeeting.bookOptions.map((nomination: any) => (
                    <div
                      key={nomination.id}
                      className="flex items-center gap-4 p-3 border border-gold-200 rounded-lg"
                    >
                      {nomination.book.cover_url && (
                        <img
                          src={nomination.book.cover_url}
                          alt={nomination.book.title}
                          className="w-16 h-24 object-cover rounded"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold text-dark-900">
                          {nomination.book.title}
                        </h3>
                        <p className="text-sm text-dark-600">
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
