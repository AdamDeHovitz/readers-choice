import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { auth } from "@/auth";
import { getMyLibraries } from "@/app/actions/libraries";
import { AppNav } from "@/components/navigation/app-nav";
import { LibraryPicker } from "@/components/libraries/library-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Only same-site paths, so ?returnTo can't send people off-site. */
function safeReturnTo(value: string | string[] | undefined): string | null {
  return typeof value === "string" && /^\/(?![/\\])/.test(value) ? value : null;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [libraries, params] = await Promise.all([
    getMyLibraries(),
    searchParams,
  ]);
  const returnTo = safeReturnTo(params.returnTo);

  return (
    <div className="bg-cream-100 min-h-screen">
      <AppNav userName={session.user.name ?? "You"} />

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {returnTo && (
          <Link
            href={returnTo}
            className="font-inria text-dark-600 hover:text-dark-900 mb-4 inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            Back
          </Link>
        )}
        <h1 className="font-voga text-dark-900 mb-6 text-3xl uppercase">
          Settings
        </h1>

        <Card id="libraries">
          <CardHeader>
            <CardTitle className="font-inria text-dark-900 text-xl font-bold">
              Libraries
            </CardTitle>
            <p className="font-inria text-dark-600 text-sm">
              While voting, each book shows how long the wait is for the ebook
              and audiobook on Libby at your libraries. Works with any library
              that uses Libby. No library card needed.
            </p>
          </CardHeader>
          <CardContent>
            <LibraryPicker initialLibraries={libraries} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
