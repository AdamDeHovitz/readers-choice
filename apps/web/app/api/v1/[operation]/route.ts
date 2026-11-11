import { handleOperationRequest } from "@/app/_operations/http";
import { getViewer } from "@/server/viewer";

// Operations over HTTP, for clients that can't call server actions (the
// mobile app, #75). Signed in with the NextAuth session cookie for now;
// mobile bearer tokens come with mobile sign-in.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ operation: string }> }
) {
  const { operation } = await params;
  return handleOperationRequest(request, operation, getViewer);
}
