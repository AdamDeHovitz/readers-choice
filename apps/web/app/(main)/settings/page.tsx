import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { isLocalPath } from "@readers-choice/core/local-path";
import { loadPageData } from "@/app/_operations/page-data";
import { getMyLibraries } from "@/server/libraries";
import * as connectedApps from "@/server/operations/connected-apps";
import { getViewer } from "@/server/viewer";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ConnectedApps } from "@/components/settings/connected-apps";
import { LibraryPicker } from "@/components/libraries/library-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Settings" };

/** Only same-site paths, so ?returnTo can't send people off-site. */
function safeReturnTo(value: string | string[] | undefined): string | null {
  return isLocalPath(value) ? value : null;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  if (!viewer) {
    redirect("/login");
  }

  const [libraries, { apps }, params] = await Promise.all([
    getMyLibraries(viewer),
    loadPageData(
      connectedApps.listConnectedApps,
      {},
      { onRefused: () => notFound() }
    ),
    searchParams,
  ]);
  const returnTo = safeReturnTo(params.returnTo);

  return (
    <>
      {returnTo && (
        <Link
          href={returnTo}
          className="text-muted-foreground hover:text-foreground -mt-2 mb-3 inline-flex h-10 items-center gap-1 text-sm font-bold"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          Back
        </Link>
      )}
      <PageHeader title="Settings" />

      <div className="space-y-4">
        <Card id="libraries">
          <CardHeader>
            <CardTitle>
              <h2>Libraries</h2>
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              While voting, each book shows how long the wait is for the ebook
              and audiobook on Libby at your libraries. Works with any library
              that uses Libby. No library card needed.
            </p>
          </CardHeader>
          <CardContent>
            <LibraryPicker initialLibraries={libraries} />
          </CardContent>
        </Card>

        <Card id="connected-apps">
          <CardHeader>
            <CardTitle>
              <h2>Connected apps</h2>
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              AI assistants like Claude that you let use your account.
              Disconnecting one stops its access right away.
            </p>
          </CardHeader>
          <CardContent>
            <ConnectedApps apps={apps} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Account</h2>
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Signed in as {viewer.name}
            </p>
          </CardHeader>
          <CardContent>
            <SignOutButton />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
