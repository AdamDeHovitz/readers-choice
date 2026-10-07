import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface RateLimitRule {
  /** Namespace for the key, e.g. "register:ip". */
  scope: string;
  /** Maximum hits allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

/**
 * Best-effort client IP from proxy headers. On Vercel both headers are set by
 * the platform; the first x-forwarded-for entry is the original client.
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  const first = forwardedFor?.split(",")[0]?.trim();
  if (first) return first;

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

/**
 * Stored keys are hashed so the rate-limit table never holds raw IPs or emails.
 */
export function rateLimitKey(scope: string, identifier: string): string {
  const digest = createHash("sha256").update(identifier).digest("hex");
  return `${scope}:${digest}`;
}

/**
 * Records a hit against the rule and returns whether the caller is allowed.
 *
 * Fails open: if the database call errors (e.g. transient outage), the request
 * is allowed and the error logged, so rate limiting can never lock everyone out.
 */
export async function consumeRateLimit(
  supabase: SupabaseClient,
  rule: RateLimitRule,
  identifier: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_key: rateLimitKey(rule.scope, identifier),
    p_limit: rule.limit,
    p_window_seconds: rule.windowSeconds,
  });

  if (error) {
    console.error(`Rate limit check failed for ${rule.scope}:`, error.message);
    return true;
  }

  return data !== false;
}
