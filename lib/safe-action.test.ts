import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Session } from "next-auth";

const { auth, createClient, fakeClient } = vi.hoisted(() => {
  const fakeClient = { from: () => undefined };
  return {
    auth: vi.fn<() => Promise<Session | null>>(),
    createClient: vi.fn(() => fakeClient),
    fakeClient,
  };
});

vi.mock("@/auth", () => ({ auth }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

import { authenticatedAction, publicAction } from "./safe-action";

const session: Session = {
  user: { id: "user-1", name: "Reader", email: "reader@example.com" },
  expires: "2099-01-01T00:00:00.000Z",
};

describe("authenticatedAction", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    auth.mockReset();
    createClient.mockClear();
    vi.restoreAllMocks();
  });

  it("rejects without running the action when there is no session", async () => {
    auth.mockResolvedValue(null);
    const action = vi.fn(async () => "never");

    expect(await authenticatedAction(action)).toEqual({
      success: false,
      error: "Unauthorized",
    });
    expect(action).not.toHaveBeenCalled();
  });

  it("rejects a session with an empty user id", async () => {
    auth.mockResolvedValue({ ...session, user: { ...session.user, id: "" } });
    const action = vi.fn(async () => "never");

    expect(await authenticatedAction(action)).toEqual({
      success: false,
      error: "Unauthorized",
    });
    expect(action).not.toHaveBeenCalled();
  });

  it("passes the session and a Supabase client to the action", async () => {
    auth.mockResolvedValue(session);
    const action = vi.fn(async () => ({ id: 42 }));

    expect(await authenticatedAction(action)).toEqual({
      success: true,
      data: { id: 42 },
    });
    expect(action).toHaveBeenCalledWith({ session, supabase: fakeClient });
  });

  it("converts a thrown error into a failure result", async () => {
    auth.mockResolvedValue(session);

    const result = await authenticatedAction(async () => {
      throw new Error("Not a member");
    });

    expect(result).toEqual({ success: false, error: "Not a member" });
  });

  it("uses a generic message when the error has none", async () => {
    auth.mockResolvedValue(session);

    const result = await authenticatedAction(async () => {
      throw new Error("");
    });

    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error.length).toBeGreaterThan(0);
  });
});

describe("publicAction", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    auth.mockReset();
    createClient.mockClear();
    vi.restoreAllMocks();
  });

  it("runs the action with a null session when signed out", async () => {
    auth.mockResolvedValue(null);
    const action = vi.fn(async () => "public data");

    expect(await publicAction(action)).toEqual({
      success: true,
      data: "public data",
    });
    expect(action).toHaveBeenCalledWith({
      session: null,
      supabase: fakeClient,
    });
  });

  it("passes the session through when signed in", async () => {
    auth.mockResolvedValue(session);
    const action = vi.fn(async () => 1);

    await publicAction(action);

    expect(action).toHaveBeenCalledWith({ session, supabase: fakeClient });
  });

  it("converts a thrown error into a failure result", async () => {
    auth.mockResolvedValue(null);

    const result = await publicAction(async () => {
      throw new Error("Club not found");
    });

    expect(result).toEqual({ success: false, error: "Club not found" });
  });
});
