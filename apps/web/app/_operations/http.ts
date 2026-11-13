import "server-only";
import type {
  ErrorCode,
  OperationResponse,
} from "@readers-choice/contract/result";
import { executeOperation } from "@/server/operation";
import { findOperation } from "@/server/operations";
import type { Viewer } from "@/server/viewer";
import { corsJson } from "./cors";
import { revalidateKeys } from "./revalidate";

const json = (body: OperationResponse, status = 200) => corsJson(body, status);

/** The transport refused the request before any operation ran. */
const badRequest = (error: string, status: number) =>
  json({ success: false, error, code: "bad_request", invalidate: [] }, status);

const STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  invalid_input: 400,
  refused: 200,
  internal: 500,
  unavailable: 503,
  bad_request: 400,
  rate_limited: 429,
};

/**
 * Serve one operation over HTTP: `POST /api/v1/<operation name>` with the
 * input as a JSON body. The status follows the result's error code: 200
 * when the operation ran (including a `refused` UserError, as for the
 * server action), 4xx when the call was refused, 500 for internal errors.
 *
 * Two kinds of caller:
 * - The mobile app sends `Authorization: Bearer …`. That request never uses
 *   the cookie (getRequestViewer), so it may come from any origin (CORS, see
 *   cors.ts).
 * - Browsers on this site send the session cookie. A cookie request must be
 *   JSON (a cross-site form can't send that without a preflight) and any
 *   Origin header must be this site, which is what stops request forgery.
 */
export async function handleOperationRequest(
  request: Request,
  name: string,
  resolveViewer: () => Promise<Viewer | null>
): Promise<Response> {
  const operation = findOperation(name);
  if (!operation) return badRequest(`Unknown operation: ${name}`, 404);

  const origin = request.headers.get("origin");
  const usesCookie = !request.headers.has("authorization");
  if (usesCookie && origin && origin !== new URL(request.url).origin) {
    return badRequest("Cross-origin requests are not allowed", 403);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json\b/i.test(contentType)) {
    return badRequest("Send the input as application/json", 415);
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return badRequest("Request body is not valid JSON", 400);
  }

  const { result, invalidated } = await executeOperation(
    operation,
    await resolveViewer(),
    input
  );
  revalidateKeys(invalidated);

  const status = result.success ? 200 : STATUS[result.code];
  return json({ ...result, invalidate: invalidated }, status);
}
