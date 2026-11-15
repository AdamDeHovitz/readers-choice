"use server";

import { redirect } from "next/navigation";
import {
  approveAuthorization,
  denialLocation,
} from "@/server/oauth/authorization";
import {
  checkConsentRequest,
  paramsFromQuery,
  withChosenScope,
} from "@/server/oauth/consent";
import { getViewer } from "@/server/viewer";

/**
 * The consent screen's Allow / Cancel (app/oauth/authorize/page.tsx).
 *
 * Not an operation: it only makes sense in a browser, signed in with the
 * site's cookie, mid-OAuth-flow. Exposing it on /api/v1 or as an MCP tool
 * would let a token holder approve apps without the consent screen.
 *
 * The form carries only the original query string; everything in it is
 * checked again here, as on the page. Next refuses server-action posts from
 * other origins, which stops a third-party page from approving for the user.
 */
export async function decideAuthorization(formData: FormData): Promise<void> {
  const query = String(formData.get("query") ?? "");
  const viewer = await getViewer();
  if (!viewer) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/oauth/authorize?${query}`)}`
    );
  }

  const { check, urls } = await checkConsentRequest(
    viewer,
    paramsFromQuery(query)
  );
  // Show the page again, which explains what's wrong.
  if (check.kind !== "ok") redirect(`/oauth/authorize?${query}`);

  if (formData.get("decision") !== "allow") {
    redirect(denialLocation(check.request, urls));
  }
  const request = withChosenScope(check.request, {
    write: formData.get("allowWrite") === "on",
    admin: formData.get("allowAdmin") === "on",
  });
  redirect(await approveAuthorization(viewer.db, viewer.userId, request, urls));
}
