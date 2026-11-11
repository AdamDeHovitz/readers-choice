import { describe, expect, it } from "vitest";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { verifyGoogleIdToken } from "./google-id-token";

const CLIENT = "ios-client.apps.googleusercontent.com";

async function setup() {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" };
  const keys = createLocalJWKSet({ keys: [jwk] });
  const sign = (
    claims: Record<string, unknown>,
    opts: { aud?: string; iss?: string; exp?: string } = {}
  ) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setIssuer(opts.iss ?? "https://accounts.google.com")
      .setAudience(opts.aud ?? CLIENT)
      .setSubject("google-123")
      .setIssuedAt()
      .setExpirationTime(opts.exp ?? "1h")
      .sign(privateKey);
  return { keys, sign };
}

const profile = {
  email: "bob@example.test",
  email_verified: true,
  name: "Bob",
  picture: "https://x/p.png",
};

describe("verifyGoogleIdToken", () => {
  it("returns the profile from a valid token for our client", async () => {
    const { keys, sign } = await setup();
    expect(
      await verifyGoogleIdToken(await sign(profile), {
        keys,
        audiences: [CLIENT],
      })
    ).toEqual({
      googleId: "google-123",
      email: "bob@example.test",
      name: "Bob",
      image: "https://x/p.png",
    });
  });

  it("rejects other audiences, issuers, expired tokens and unverified emails", async () => {
    const { keys, sign } = await setup();
    const check = async (token: string) =>
      verifyGoogleIdToken(token, { keys, audiences: [CLIENT] });
    expect(
      await check(await sign(profile, { aud: "someone-elses-app" }))
    ).toBeNull();
    expect(
      await check(await sign(profile, { iss: "https://evil.example" }))
    ).toBeNull();
    expect(await check(await sign(profile, { exp: "-1m" }))).toBeNull();
    expect(
      await check(await sign({ ...profile, email_verified: false }))
    ).toBeNull();
    expect(await check("garbage")).toBeNull();
  });

  it("rejects a token signed by a key Google didn't publish", async () => {
    const { keys } = await setup();
    const other = await setup();
    expect(
      await verifyGoogleIdToken(await other.sign(profile), {
        keys,
        audiences: [CLIENT],
      })
    ).toBeNull();
  });

  it("refuses everything when no client IDs are configured", async () => {
    const { keys, sign } = await setup();
    expect(
      await verifyGoogleIdToken(await sign(profile), { keys, audiences: [] })
    ).toBeNull();
  });
});
