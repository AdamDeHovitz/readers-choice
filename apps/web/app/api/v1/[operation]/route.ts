import { preflight } from "@/app/_operations/cors";
import { handleOperationRequest } from "@/app/_operations/http";
import { getRequestViewer } from "@/server/viewer";

// Operations over HTTP, for clients that can't call server actions (the
// mobile app, #75). The viewer comes from the app's bearer access token or,
// for browsers on this site, the NextAuth session cookie.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ operation: string }> }
) {
  const { operation } = await params;
  return handleOperationRequest(request, operation, () =>
    getRequestViewer(request)
  );
}

export const OPTIONS = preflight;
