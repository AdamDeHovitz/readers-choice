import { describe, expect, it, vi } from "vitest";
import { createOperationClient } from "./client";
import { listThemes } from "./themes";

const CLUB = "22222222-0000-4000-8000-000000000001";

describe("createOperationClient", () => {
  it("posts JSON to /api/v1/<name> with client-wide then per-call headers", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ success: true, data: { themes: [] }, invalidate: [] })
    );
    const client = createOperationClient({
      baseUrl: "https://site.example",
      headers: () => ({ "X-App": "mobile", Authorization: "Bearer old" }),
      fetch,
    });
    const result = await client.call(
      listThemes,
      { bookClubId: CLUB },
      { headers: { Authorization: "Bearer new" } }
    );
    expect(result).toEqual({
      success: true,
      data: { themes: [] },
      invalidate: [],
    });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://site.example/api/v1/themes.list");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      "Content-Type": "application/json",
      "X-App": "mobile",
      Authorization: "Bearer new",
    });
    expect(JSON.parse(String(init?.body))).toEqual({ bookClubId: CLUB });
  });

  it("turns a network failure into an unavailable result instead of throwing", async () => {
    const client = createOperationClient({
      baseUrl: "https://site.example",
      fetch: async () => {
        throw new TypeError("Network request failed");
      },
    });
    expect(await client.call(listThemes, { bookClubId: CLUB })).toMatchObject({
      success: false,
      code: "unavailable",
      invalidate: [],
    });
  });
});
