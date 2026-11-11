import "server-only";
import type { OperationResponse } from "@readers-choice/contract/result";
import { executeOperation } from "@/server/operation";
import { findOperation } from "@/server/operations";
import type { Viewer } from "@/server/viewer";
import { revalidateKeys } from "./revalidate";

const json = (body: OperationResponse, status = 200) =>
  Response.json(body, { status });

const failure = (error: string, status: number) =>
  json({ success: false, error, invalidate: [] }, status);

/**
 * Serve one operation over HTTP: `POST /api/v1/<operation name>` with the
 * input as a JSON body. Domain failures (a UserError) are 200 with
 * `success: false`, like the server action; 4xx means the call itself was
 * refused.
 *
 * Browsers send the session cookie, so the request must be JSON (a
 * cross-site form can't send that without a CORS preflight, which we never
 * grant) and any Origin header must be this site.
 */
export async function handleOperationRequest(
  request: Request,
  name: string,
  resolveViewer: () => Promise<Viewer | null>
): Promise<Response> {
  const operation = findOperation(name);
  if (!operation) return failure(`Unknown operation: ${name}`, 404);

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return failure("Cross-origin requests are not allowed", 403);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json\b/i.test(contentType)) {
    return failure("Send the input as application/json", 415);
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return failure("Request body is not valid JSON", 400);
  }

  const { result, invalidated, rejected } = await executeOperation(
    operation,
    await resolveViewer(),
    input
  );
  revalidateKeys(invalidated);

  const status =
    rejected === "unauthenticated"
      ? 401
      : rejected === "invalid-input"
        ? 400
        : 200;
  return json({ ...result, invalidate: invalidated }, status);
}
