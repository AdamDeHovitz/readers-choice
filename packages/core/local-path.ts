/**
 * Whether a redirect target stays on this site: a path starting with one
 * "/". Browsers treat "//host" and "/\host" as other sites, and strip tabs
 * and newlines first ("/\t/host" becomes "//host"), so all of those are
 * refused.
 */
export function isLocalPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\/(?![/\\])/.test(value) &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}
