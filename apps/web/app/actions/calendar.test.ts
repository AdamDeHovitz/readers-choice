import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { fakeDb } from "@/test/fake-db";

const state = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<Session | null>>(),
  db: null as unknown,
}));

vi.mock("@/auth", () => ({ auth: state.auth }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => state.db }));

import { getCalendarFeedToken, resetCalendarFeedToken } from "./calendar";

const session: Session = {
  user: { id: "user", name: "Reader", email: "reader@example.test" },
  expires: "2099-01-01T00:00:00.000Z",
};

function useDb(results: Parameters<typeof fakeDb>[0]) {
  const fake = fakeDb(results);
  state.db = fake.db;
  return fake;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy";
  state.auth.mockResolvedValue(session);
});

describe.each([
  ["getCalendarFeedToken", getCalendarFeedToken],
  ["resetCalendarFeedToken", resetCalendarFeedToken],
])("%s", (_, action) => {
  it("rejects signed-out callers without touching the database", async () => {
    state.auth.mockResolvedValue(null);
    const { calls } = useDb([]);
    expect(await action("club")).toEqual({
      success: false,
      error: "Unauthorized",
    });
    expect(calls).toHaveLength(0);
  });

  it("rejects non-members before reading or writing tokens", async () => {
    const { calls } = useDb([{ data: null }]);
    expect(await action("club")).toEqual({
      success: false,
      error: "Only members can subscribe to the club calendar",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('from("members")');
  });

  it("issues a token to a member", async () => {
    const { calls } = useDb([
      { data: { is_admin: false } },
      { data: null },
      {},
    ]);
    const result = await action("club");
    expect(result.success).toBe(true);
    expect(calls.some((c) => c[0] === 'from("calendar_feed_tokens")')).toBe(
      true
    );
  });
});
