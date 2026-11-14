import "server-only";
import { lookup, type LookupAddress } from "dns";
import { request } from "https";
import { BlockList, isIP, type LookupFunction } from "net";
import { z } from "zod";
import { clientName, redirectUris } from "./schemas";

/**
 * Client ID Metadata Documents (draft-ietf-oauth-client-id-metadata-document,
 * the MCP spec's preferred client registration). The client_id is an HTTPS
 * URL; the document there names the client and its redirect URIs.
 *
 * Fetching a URL an anonymous caller chose is a server-side request forgery
 * risk, so the fetch is locked down:
 * - HTTPS on the default port only, to a DNS name (no IP literals, no
 *   localhost), with no credentials, query or fragment in the URL.
 * - Every address the name resolves to is checked against private,
 *   loopback, link-local and other reserved ranges at connect time (the
 *   socket's own lookup), so DNS rebinding can't swap in an internal
 *   address after the check.
 * - No redirects, a 5-second deadline, and a 16 KiB response cap.
 * - Fetches are rate-limited per signed-in user (clients.ts), so the
 *   consent page can't be used to make the server request URLs in bulk.
 */

const MAX_BYTES = 16 * 1024;
const TIMEOUT_MS = 5000;

/** Whether a client_id is shaped like a metadata document URL. */
export function isClientMetadataDocumentUrl(value: string): boolean {
  if (!value.startsWith("https://") || value.length > 512) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.href === value &&
    url.protocol === "https:" &&
    url.port === "" &&
    url.username === "" &&
    url.password === "" &&
    url.search === "" &&
    url.hash === "" &&
    url.pathname !== "/" &&
    !url.pathname.split("/").some((part) => part === "." || part === "..") &&
    isIP(url.hostname.replace(/^\[|\]$/g, "")) === 0 &&
    url.hostname.includes(".") &&
    url.hostname !== "localhost" &&
    !url.hostname.endsWith(".localhost")
  );
}

// Separate lists: a BlockList holding IPv6 rules also matches IPv4 addresses
// against them (as IPv4-mapped), so ::ffff:0:0/96 would block every IPv4.
const blockedV4 = new BlockList();
const blockedV6 = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedV4.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96], // IPv4-mapped
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blockedV6.addSubnet(network, prefix, "ipv6");
}

/** Whether an address is somewhere a public metadata document can't be. */
export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return blockedV4.check(address, "ipv4");
  // IPv4-mapped addresses (::ffff:0:0/96) are refused; no public host needs one.
  if (family === 6) return blockedV6.check(address, "ipv6");
  return true;
}

/** dns.lookup that refuses names resolving to any blocked address. */
const publicOnlyLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, "", 0);
    const list = addresses as LookupAddress[];
    if (list.length === 0 || list.some((a) => isBlockedAddress(a.address))) {
      return callback(
        Object.assign(new Error(`${hostname} resolves to a blocked address`), {
          code: "EBLOCKED",
        }),
        "",
        0
      );
    }
    if (options.all) return callback(null, list as never);
    callback(null, list[0].address, list[0].family);
  });
};

/** GET a small JSON body, or null on any failure. */
function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve) => {
    const req = request(
      url,
      {
        method: "GET",
        lookup: publicOnlyLookup,
        headers: { accept: "application/json" },
        // An overall deadline: a socket timeout alone resets on every byte,
        // so a server dripping its response could hold the request open.
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
      (res) => {
        const type = res.headers["content-type"] ?? "";
        if (res.statusCode !== 200 || !/^application\/json\b/i.test(type)) {
          res.resume();
          return resolve(null);
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            req.destroy();
            return resolve(null);
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch {
            resolve(null);
          }
        });
        res.on("error", () => resolve(null));
      }
    );
    req.on("error", () => resolve(null));
    req.end();
  });
}

const metadataDocument = z.object({
  client_id: z.string(),
  client_name: clientName,
  redirect_uris: redirectUris,
  // Public clients only: a client that says it authenticates some other way
  // (e.g. private_key_jwt) isn't one we can serve.
  token_endpoint_auth_method: z.literal("none").optional(),
});

export interface ClientMetadata {
  clientName: string;
  redirectUris: string[];
}

/**
 * Fetch and validate the metadata document at `clientId`. Null when it
 * can't be fetched, isn't valid, or names a different client_id.
 */
export async function fetchClientMetadataDocument(
  clientId: string,
  fetchBody: (url: string) => Promise<unknown> = fetchJson
): Promise<ClientMetadata | null> {
  if (!isClientMetadataDocumentUrl(clientId)) return null;
  const parsed = metadataDocument.safeParse(await fetchBody(clientId));
  if (!parsed.success || parsed.data.client_id !== clientId) return null;
  return {
    clientName: parsed.data.client_name,
    redirectUris: parsed.data.redirect_uris,
  };
}
