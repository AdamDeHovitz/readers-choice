import { describe, expect, it } from "vitest";
import {
  fetchClientMetadataDocument,
  isBlockedAddress,
  isClientMetadataDocumentUrl,
} from "./client-metadata";

describe("isClientMetadataDocumentUrl", () => {
  it.each([
    "https://claude.ai/oauth/mcp-oauth-client-metadata",
    "https://app.example.com/client.json",
  ])("accepts %s", (url) => {
    expect(isClientMetadataDocumentUrl(url)).toBe(true);
  });

  it.each([
    "http://app.example.com/client.json",
    "https://app.example.com/",
    "https://app.example.com:8443/client.json",
    "https://user@app.example.com/client.json",
    "https://app.example.com/client.json?x=1",
    "https://app.example.com/client.json#x",
    "https://127.0.0.1/client.json",
    "https://[::1]/client.json",
    "https://localhost/client.json",
    "https://foo.localhost/client.json",
    "https://intranet/client.json",
    "https://app.example.com/a/../client.json",
    "https://APP.example.com/client.json",
  ])("refuses %s", (url) => {
    expect(isClientMetadataDocumentUrl(url)).toBe(false);
  });
});

describe("isBlockedAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "::",
    "fe80::1",
    "fd00::1",
    "::ffff:127.0.0.1",
    "::ffff:8.8.8.8",
    "64:ff9b::a00:1",
    "not-an-ip",
  ])("blocks %s", (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each(["8.8.8.8", "160.79.104.10", "2606:4700::1111"])(
    "allows %s",
    (address) => {
      expect(isBlockedAddress(address)).toBe(false);
    }
  );
});

describe("fetchClientMetadataDocument", () => {
  const id = "https://app.example.com/client.json";
  const valid = {
    client_id: id,
    client_name: "Example App",
    redirect_uris: ["https://app.example.com/cb"],
  };

  it("returns a valid document's name and redirect URIs", async () => {
    expect(await fetchClientMetadataDocument(id, async () => valid)).toEqual({
      clientName: "Example App",
      redirectUris: ["https://app.example.com/cb"],
    });
  });

  it.each([
    ["another client_id", { ...valid, client_id: "https://evil.example/c" }],
    ["an http redirect", { ...valid, redirect_uris: ["http://evil.example"] }],
    ["no name", { ...valid, client_name: undefined }],
    [
      "a bidi control character",
      { ...valid, client_name: `App${String.fromCharCode(0x202e)}` },
    ],
    [
      "private_key_jwt",
      { ...valid, token_endpoint_auth_method: "private_key_jwt" },
    ],
    ["no body", null],
  ])("refuses a document with %s", async (_, document) => {
    expect(await fetchClientMetadataDocument(id, async () => document)).toBe(
      null
    );
  });

  it("never fetches a URL that isn't a metadata document URL", async () => {
    let fetched = false;
    await fetchClientMetadataDocument("https://127.0.0.1/c.json", async () => {
      fetched = true;
      return valid;
    });
    expect(fetched).toBe(false);
  });
});
