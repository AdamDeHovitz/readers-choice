import "server-only";
import type {
  ErrorCode,
  OperationResponse,
} from "@readers-choice/contract/result";
import { executeOperation } from "@/server/operation";
import { findOperation } from "@/server/operations";
import type { Viewer } from "@/server/viewer";
import { revalidateKeys } from "./revalidate";

const json = (body: OperationResponse, status = 200) =>
  Response.json(body, { status });

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
  if (!operation) return badRequest(`Unknown operation: ${name}`, 404);

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
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
