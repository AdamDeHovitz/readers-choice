import { beforeAll, describe, expect, it } from "vitest";
import { fakeDb } from "@/test/fake-db";
import * as mobile from "../mobile-sessions";
import { signAccessToken, verifyAccessToken } from "./access-tokens";
import { oauthUrls } from "./config";

const prod = oauthUrls("https://rc.example");
const preview = oauthUrls("https://rc-git-branch.vercel.app");
const claims = {
  userId: "user-1",
  clientId: "client-1",
  grantId: "grant-1",
  scope: "read",
};

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-at-least-32-characters-long";
});

describe("MCP access tokens", () => {
  it("verify only for the deployment they were issued for", async () => {
    const { token } = await signAccessToken(claims, prod);
    expect(await verifyAccessToken(token, prod)).toMatchObject(claims);
    expect(await verifyAccessToken(token, preview)).toBeNull();
  });

  it("never cross with mobile access tokens, either way", async () => {
    const { token } = await signAccessToken(claims, prod);
    expect(await mobile.verifyAccessToken(token)).toBeNull();

    const { db } = fakeDb([{ data: { id: "session-1" } }]);
    const session = await mobile.startSession(
      db,
      { id: "user-1", name: "Bob", email: "bob@example.test" },
      undefined
    );
    expect(await verifyAccessToken(session.accessToken, prod)).toBeNull();
  });

  it("expire after an hour", async () => {
    const issued = new Date(Date.now() - 61 * 60 * 1000);
    const { token } = await signAccessToken(claims, prod, issued);
    expect(await verifyAccessToken(token, prod)).toBeNull();
  });
});
