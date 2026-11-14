import { createHash } from "crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeJwt } from "jose";
import { fakeDb } from "@/test/fake-db";
import { hashToken } from "../tokens";
import {
  checkAuthorizationRequest,
  exchangeAuthorizationCode,
  refreshAccessToken,
} from "./authorization";
import { oauthUrls } from "./config";
import { OAuthTokenError } from "./errors";

const urls = oauthUrls("https://rc.example");
const NOW = new Date("2026-11-14T12:00:00Z");
const verifier = "v".repeat(43);
const challenge = createHash("sha256").update(verifier).digest("base64url");
const clientRow = {
  id: "client-1",
  kind: "registered",
  client_name: "Test App",
  redirect_uris: ["https://app.example/cb"],
  metadata_fetched_at: null,
};

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-at-least-32-characters-long";
});

const codeRow = {
  client_id: "client-1",
  user_id: "user-1",
  redirect_uri: "https://app.example/cb",
  code_challenge: challenge,
  scope: "read write",
  resource: urls.resource,
};

const exchangeInput = {
  code: "the-code",
  clientId: "client-1",
  redirectUri: "https://app.example/cb",
  codeVerifier: verifier,
  resource: urls.resource,
};

async function refusal(promise: Promise<unknown>) {
  const error = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(OAuthTokenError);
  return (error as OAuthTokenError).code;
}

describe("checkAuthorizationRequest", () => {
  const params = {
    response_type: "code",
    client_id: "client-1",
    redirect_uri: "https://app.example/cb",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: "xyz",
    resource: urls.resource,
  };

  it("accepts a complete request and grants read even when not asked", async () => {
    const { db } = fakeDb([{ data: clientRow }]);
    const check = await checkAuthorizationRequest(
      db,
      { ...params, scope: "write" },
      urls,
      "user-1"
    );
    expect(check).toMatchObject({
      kind: "ok",
      request: { scope: "read write", state: "xyz", resource: urls.resource },
    });
  });

  it("shows the error itself for an unknown client or unregistered redirect", async () => {
    const unknown = fakeDb([{ data: null }]);
    expect(
      (await checkAuthorizationRequest(unknown.db, params, urls, "user-1")).kind
    ).toBe("invalid");

    const badRedirect = fakeDb([{ data: clientRow }]);
    expect(
      (
        await checkAuthorizationRequest(
          badRedirect.db,
          { ...params, redirect_uri: "https://evil.example/cb" },
          urls,
          "user-1"
        )
      ).kind
    ).toBe("invalid");
  });

  it("builds the client's error address (with state and iss) for the page to link to", async () => {
    const { db } = fakeDb([{ data: clientRow }]);
    const check = await checkAuthorizationRequest(
      db,
      { ...params, code_challenge_method: "plain" },
      urls,
      "user-1"
    );
    expect(check.kind).toBe("error");
    const location = new URL((check as { location: string }).location);
    expect(location.origin + location.pathname).toBe("https://app.example/cb");
    expect(location.searchParams.get("error")).toBe("invalid_request");
    expect(location.searchParams.get("state")).toBe("xyz");
    expect(location.searchParams.get("iss")).toBe("https://rc.example");
  });

  it("refuses repeated parameters and foreign resources", async () => {
    const repeated = fakeDb([{ data: clientRow }]);
    expect(
      (
        await checkAuthorizationRequest(
          repeated.db,
          { ...params, code_challenge: [challenge, challenge] },
          urls,
          "user-1"
        )
      ).kind
    ).toBe("error");

    const foreign = fakeDb([{ data: clientRow }]);
    const check = await checkAuthorizationRequest(
      foreign.db,
      { ...params, resource: "https://other.example/mcp" },
      urls,
      "user-1"
    );
    expect(
      new URL((check as { location: string }).location).searchParams.get(
        "error"
      )
    ).toBe("invalid_target");
  });
});

describe("exchangeAuthorizationCode", () => {
  it("consumes the code once, creates a grant and links it", async () => {
    const { db, calls } = fakeDb([
      { data: codeRow }, // consume
      { data: { id: "grant-1" } }, // createGrant
      { data: null }, // link code → grant
    ]);
    const tokens = await exchangeAuthorizationCode(
      db,
      exchangeInput,
      urls,
      NOW
    );

    const consume = calls[0].join(".");
    expect(consume).toContain(`eq("code_hash", "${hashToken("the-code")}")`);
    expect(consume).toContain('is("consumed_at", null)');
    expect(consume).toContain('gt("expires_at"');
    expect(calls[1].join(".")).toContain(
      '"redirect_uri":"https://app.example/cb"'
    );
    expect(calls[2].join(".")).toContain('"grant_id":"grant-1"');
    expect(tokens.scope).toBe("read write");
    expect(JSON.stringify(calls)).not.toContain(tokens.refresh_token);
    expect(decodeJwt(tokens.access_token)).toMatchObject({
      sub: "user-1",
      aud: urls.resource,
      iss: urls.issuer,
      gid: "grant-1",
      client_id: "client-1",
    });
  });

  it.each([
    ["a wrong verifier", { codeVerifier: "w".repeat(43) }],
    ["another client", { clientId: "client-2" }],
    ["another redirect URI", { redirectUri: "https://app.example/other" }],
  ])("refuses %s after consuming the code", async (_, change) => {
    const { db, remaining } = fakeDb([{ data: codeRow }]);
    expect(
      await refusal(
        exchangeAuthorizationCode(
          db,
          { ...exchangeInput, ...change },
          urls,
          NOW
        )
      )
    ).toBe("invalid_grant");
    expect(remaining()).toBe(0);
  });

  it("revokes the grant when a used code comes back", async () => {
    const { db, calls } = fakeDb([
      { data: null }, // consume fails: already used
      { data: { grant_id: "grant-1" } },
      { data: null }, // revoke
    ]);
    expect(
      await refusal(exchangeAuthorizationCode(db, exchangeInput, urls, NOW))
    ).toBe("invalid_grant");
    expect(calls[2].join(".")).toContain('eq("id", "grant-1")');
    expect(calls[2].join(".")).toContain("revoked_at");
  });

  it("refuses a resource other than this MCP server before touching the code", async () => {
    const { db, calls } = fakeDb([]);
    expect(
      await refusal(
        exchangeAuthorizationCode(
          db,
          { ...exchangeInput, resource: "https://other.example/mcp" },
          urls,
          NOW
        )
      )
    ).toBe("invalid_target");
    expect(calls).toHaveLength(0);
  });
});

describe("refreshAccessToken", () => {
  const grantRow = {
    id: "grant-1",
    user_id: "user-1",
    client_id: "client-1",
    scope: "read write",
    resource: urls.resource,
    redirect_uri: "https://app.example/cb",
  };

  it("rotates only the client's own live grant for this resource", async () => {
    const { db, calls } = fakeDb([{ data: grantRow }]);
    const tokens = await refreshAccessToken(
      db,
      { refreshToken: "rt", clientId: "client-1", scope: null, resource: null },
      urls,
      NOW
    );
    const rotate = calls[0].join(".");
    expect(rotate).toContain('eq("client_id", "client-1")');
    expect(rotate).toContain(`eq("resource", "${urls.resource}")`);
    expect(rotate).toContain('is("revoked_at", null)');
    // Idle 90 days, or a year since approval, and it's over.
    expect(rotate).toContain('gt("last_used_at", "2026-08-16T12:00:00.000Z")');
    expect(rotate).toContain('gt("created_at", "2025-11-14T12:00:00.000Z")');
    expect(tokens.refresh_token).not.toBe("rt");
  });

  it("narrows scope on request but never widens it", async () => {
    const narrow = fakeDb([{ data: grantRow }]);
    expect(
      (
        await refreshAccessToken(
          narrow.db,
          {
            refreshToken: "rt",
            clientId: "client-1",
            scope: "read",
            resource: null,
          },
          urls,
          NOW
        )
      ).scope
    ).toBe("read");

    const widen = fakeDb([{ data: { ...grantRow, scope: "read" } }]);
    expect(
      await refusal(
        refreshAccessToken(
          widen.db,
          {
            refreshToken: "rt",
            clientId: "client-1",
            scope: "read write",
            resource: null,
          },
          urls,
          NOW
        )
      )
    ).toBe("invalid_scope");
  });

  it("revokes the grant when a replaced token comes back, however soon", async () => {
    const { db, calls } = fakeDb([
      { data: null }, // rotation misses
      { data: { id: "grant-1", revoked_at: null } }, // a replaced token
      { data: null }, // revoke
    ]);
    expect(
      await refusal(
        refreshAccessToken(
          db,
          {
            refreshToken: "old",
            clientId: "client-1",
            scope: null,
            resource: null,
          },
          urls,
          NOW
        )
      )
    ).toBe("invalid_grant");
    expect(calls[2].join(".")).toContain("revoked_at");
  });
});
