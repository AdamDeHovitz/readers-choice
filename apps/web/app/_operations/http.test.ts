import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOperationClient } from "@readers-choice/contract/client";
import { contracts } from "@readers-choice/contract";
import { fakeDb } from "@/test/fake-db";
import type { Viewer } from "@/server/viewer";

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { handleOperationRequest } from "./http";

const SITE = "https://readers-choice.example";
const CLUB = "22222222-0000-4000-8000-000000000001";
const THEME = "55555555-0000-4000-8000-000000000001";

const post = (
  name: string,
  body: string,
  headers: Record<string, string> = { "content-type": "application/json" }
) => new Request(`${SITE}/api/v1/${name}`, { method: "POST", headers, body });

const viewerWith = (results: Parameters<typeof fakeDb>[0]) => {
  const fake = fakeDb(results);
  const viewer: Viewer = { userId: "me", name: "Me", db: fake.db };
  return { viewer, ...fake };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

async function send(request: Request, viewer: Viewer | null) {
  const response = await handleOperationRequest(
    request,
    new URL(request.url).pathname.split("/").pop()!,
    async () => viewer
  );
  return { status: response.status, body: await response.json() };
}

describe("handleOperationRequest", () => {
  it("404s an unknown operation", async () => {
    expect(await send(post("themes.nope", "{}"), null)).toEqual({
      status: 404,
      body: {
        success: false,
        error: "Unknown operation: themes.nope",
        code: "bad_request",
        invalidate: [],
      },
    });
  });

  it("refuses cross-origin browser requests before running anything", async () => {
    const { viewer, calls } = viewerWith([]);
    const { status } = await send(
      post("themes.delete", JSON.stringify({ themeId: THEME }), {
        "content-type": "application/json",
        origin: "https://evil.example",
      }),
      viewer
    );
    expect(status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it("lets a bearer request through from another origin, since it never uses the cookie", async () => {
    const { viewer } = viewerWith([
      { data: { is_admin: false } },
      { data: [] },
    ]);
    const response = await handleOperationRequest(
      post("themes.suggestions", JSON.stringify({ bookClubId: CLUB }), {
        "content-type": "application/json",
        origin: "http://localhost:8081",
        authorization: "Bearer token-from-the-app",
      }),
      "themes.suggestions",
      async () => viewer
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
  });

  it("allows same-origin requests and requests without an Origin (native apps)", async () => {
    for (const headers of <Record<string, string>[]>[
      { "content-type": "application/json", origin: SITE },
      { "content-type": "application/json" },
    ]) {
      const { viewer } = viewerWith([
        { data: { is_admin: false } },
        { data: [] },
      ]);
      const { status, body } = await send(
        post(
          "themes.suggestions",
          JSON.stringify({ bookClubId: CLUB }),
          headers
        ),
        viewer
      );
      expect(status).toBe(200);
      expect(body).toEqual({ success: true, data: [], invalidate: [] });
    }
  });

  it("415s a non-JSON body (what a cross-site form would send)", async () => {
    const { status } = await send(
      post("themes.delete", `themeId=${THEME}`, {
        "content-type": "application/x-www-form-urlencoded",
      }),
      viewerWith([]).viewer
    );
    expect(status).toBe(415);
  });

  it("400s malformed JSON and input that fails the schema", async () => {
    expect(
      (await send(post("themes.delete", "{"), viewerWith([]).viewer)).status
    ).toBe(400);
    expect(
      await send(
        post("themes.delete", JSON.stringify({ themeId: "1" })),
        viewerWith([]).viewer
      )
    ).toEqual({
      status: 400,
      body: {
        success: false,
        error: "Invalid id",
        code: "invalid_input",
        invalidate: [],
      },
    });
  });

  it("401s signed-out callers", async () => {
    expect(
      await send(
        post("themes.delete", JSON.stringify({ themeId: THEME })),
        null
      )
    ).toEqual({
      status: 401,
      body: {
        success: false,
        error: "Unauthorized",
        code: "unauthenticated",
        invalidate: [],
      },
    });
  });

  it("returns a refused operation as 200 with its message, like a server action", async () => {
    const theme = {
      data: {
        id: THEME,
        book_club_id: CLUB,
        submitted_by: "other",
        meetings: [],
      },
    };
    const { viewer } = viewerWith([theme, { data: null }]);
    expect(
      await send(
        post("themes.delete", JSON.stringify({ themeId: THEME })),
        viewer
      )
    ).toEqual({
      status: 200,
      body: {
        success: false,
        error: "You must be a member to delete themes",
        code: "refused",
        invalidate: [],
      },
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("500s an unexpected server error, without the cause", async () => {
    const { viewer } = viewerWith([
      { data: null, error: { message: "connection reset by 10.0.0.1" } },
    ]);
    const { status, body } = await send(
      post("themes.delete", JSON.stringify({ themeId: THEME })),
      viewer
    );
    expect(status).toBe(500);
    expect(body).toMatchObject({ success: false, code: "internal" });
    expect(JSON.stringify(body)).not.toContain("10.0.0.1");
  });

  it("returns the invalidated keys and revalidates the web pages", async () => {
    const theme = {
      data: { id: THEME, book_club_id: CLUB, submitted_by: "me", meetings: [] },
    };
    const { viewer } = viewerWith([theme, { data: { is_admin: false } }, {}]);
    expect(
      await send(
        post("themes.delete", JSON.stringify({ themeId: THEME })),
        viewer
      )
    ).toEqual({
      status: 200,
      body: { success: true, invalidate: [["club", CLUB, "themes"]] },
    });
    expect(revalidatePath).toHaveBeenCalledWith(
      `/book-clubs/${CLUB}/themes`,
      "layout"
    );
  });
});

describe("createOperationClient", () => {
  it("calls an operation by contract and returns its typed result", async () => {
    const { viewer } = viewerWith([
      { data: { is_admin: false } },
      { data: [] },
      { data: { id: THEME } },
    ]);
    const seen: Request[] = [];
    const client = createOperationClient({
      baseUrl: SITE,
      headers: () => ({ authorization: "Bearer test" }),
      fetch: async (url, init) => {
        const request = new Request(url, init);
        seen.push(request.clone());
        return handleOperationRequest(
          request,
          "themes.suggest",
          async () => viewer
        );
      },
    });

    const result = await client.call(contracts.themes.suggestTheme, {
      bookClubId: CLUB,
      name: "Mysteries",
    });

    expect(result).toEqual({
      success: true,
      data: { themeId: THEME },
      invalidate: [["club", CLUB, "themes"]],
    });
    expect(seen[0].url).toBe(`${SITE}/api/v1/themes.suggest`);
    expect(seen[0].headers.get("authorization")).toBe("Bearer test");
  });

  it("reports an unreachable server as a failed result instead of throwing", async () => {
    const client = createOperationClient({
      baseUrl: SITE,
      fetch: async () => {
        throw new TypeError("Network request failed");
      },
    });
    expect(
      await client.call(contracts.themes.deleteTheme, { themeId: THEME })
    ).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
      code: "unavailable",
      invalidate: [],
    });
  });
});
