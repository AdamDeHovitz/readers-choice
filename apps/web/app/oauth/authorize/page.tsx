import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SCOPE_DESCRIPTIONS, parseScope } from "@readers-choice/core/oauth";
import { decideAuthorization } from "@/app/actions/oauth";
import { redirectsToThisDevice } from "@/server/oauth/authorization";
import { checkConsentRequest, queryFromParams } from "@/server/oauth/consent";
import { getViewer } from "@/server/viewer";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Connect an app" };

/**
 * The OAuth consent screen: an app (Claude, ChatGPT, …) asks to act for the
 * signed-in user through the MCP server. The proxy sends signed-out
 * visitors to /login first, keeping the query string.
 *
 * What the user sees is what they can trust: an app's name is its own
 * claim, so the screen leads with where approving sends them (the redirect
 * host), which is what decides who receives the access.
 */
export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = queryFromParams(params);
  const viewer = await getViewer();
  if (!viewer) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/oauth/authorize?${query}`)}`
    );
  }

  const { check } = await checkConsentRequest(viewer, params);

  return (
    <div className="pt-safe pb-safe flex min-h-dvh items-center justify-center p-4">
      <div className="bg-card border-border w-full max-w-md space-y-6 rounded-3xl border p-6 shadow-sm sm:p-8">
        {check.kind !== "ok" ? (
          <>
            <h1 className="font-display text-foreground text-3xl">
              Can&apos;t connect this app
            </h1>
            <Alert variant="destructive">
              <AlertTitle>The request isn&apos;t valid</AlertTitle>
              {check.message} Go back to the app and try connecting again.
            </Alert>
            {check.kind === "error" && (
              // A link, not a redirect: following it is the user's choice.
              <Button asChild variant="outline" className="w-full">
                <a href={check.location} rel="noreferrer">
                  Back to {new URL(check.location).host}
                </a>
              </Button>
            )}
          </>
        ) : (
          <Consent
            query={query}
            viewerName={viewer.name}
            request={check.request}
          />
        )}
      </div>
    </div>
  );
}

function Consent({
  query,
  viewerName,
  request,
}: {
  query: string;
  viewerName: string;
  request: Extract<
    Awaited<ReturnType<typeof checkConsentRequest>>["check"],
    { kind: "ok" }
  >["request"];
}) {
  const { client } = request;
  const destination = new URL(request.redirectUri);
  const local = redirectsToThisDevice(request);
  const asked = parseScope(request.scope);
  const asksToWrite = asked.includes("write");
  const asksForAdmin = asksToWrite && asked.includes("admin");
  const destinationAddress = `${destination.origin}${destination.pathname}`;

  return (
    <form action={decideAuthorization} className="space-y-6">
      <input type="hidden" name="query" value={query} />
      <div className="space-y-2">
        <p className="text-dark-500 text-xs font-bold tracking-wide uppercase">
          Connect an app
        </p>
        <h1 className="font-display text-foreground text-3xl break-words">
          Allow {client.name} to use your Readers&apos; Choice account?
        </h1>
        <p className="text-muted-foreground text-sm">
          Signed in as {viewerName}.
        </p>
      </div>

      <Alert>
        <AlertTitle>
          {local
            ? "Approving sends access to an app on this device"
            : `Approving sends access to ${destination.host}`}
        </AlertTitle>
        <p className="break-all">
          {local ? "Address" : "Full address"}: {destinationAddress}
        </p>
        {client.kind === "metadata_document" && (
          <p className="break-all">App details published at: {client.id}</p>
        )}
        <p className="mt-2">
          The app chose the name &ldquo;{client.name}&rdquo; itself, so check
          the address. Only continue if you started connecting this app
          yourself.
        </p>
      </Alert>

      <div className="space-y-3">
        <h2 className="text-lg font-bold">It will be able to</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>{SCOPE_DESCRIPTIONS.read}</li>
        </ul>
        {asksToWrite && (
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="allowWrite"
              defaultChecked
              className="accent-rust-600 mt-0.5 size-5 shrink-0"
            />
            <span>
              <span className="font-bold">Also allow changes. </span>
              {SCOPE_DESCRIPTIONS.write}.
            </span>
          </label>
        )}
        {asksForAdmin && (
          // Off by default: the app reads text other members wrote, which
          // could try to talk it into using admin powers.
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="allowAdmin"
              className="accent-rust-600 mt-0.5 size-5 shrink-0"
            />
            <span>
              <span className="font-bold">Also allow admin actions. </span>
              {SCOPE_DESCRIPTIONS.admin}. Only applies with changes allowed, in
              clubs where you&apos;re an admin.
            </span>
          </label>
        )}
        <p className="text-muted-foreground text-sm">
          You can disconnect it at any time in Settings.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button type="submit" name="decision" value="allow" className="flex-1">
          Allow
        </Button>
        <Button
          type="submit"
          name="decision"
          value="deny"
          variant="outline"
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
