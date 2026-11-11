import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { UserError } from "@readers-choice/core/user-error";

const { auth, client } = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<Session | null>>(),
  client: { from: () => undefined },
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => client }));

import { runAction } from "./action";

const session: Session = {
  user: { id: "user-1", name: "Reader", email: "reader@example.test" },
  expires: "2099-01-01T00:00:00.000Z",
};

describe("runAction", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    auth.mockReset();
    vi.restoreAllMocks();
  });

  it("rejects without running the body when signed out", async () => {
    auth.mockResolvedValue(null);
    const body = vi.fn(async () => "never");

    expect(await runAction("Failed", body)).toEqual({
      success: false,
      error: "Unauthorized",
    });
    expect(body).not.toHaveBeenCalled();
  });

  it("rejects a session with an empty user id", async () => {
    auth.mockResolvedValue({ ...session, user: { ...session.user, id: "" } });
    const body = vi.fn(async () => "never");

    expect((await runAction("Failed", body)).success).toBe(false);
    expect(body).not.toHaveBeenCalled();
  });

  it("passes the viewer to the body and wraps its result", async () => {
    auth.mockResolvedValue(session);
    const body = vi.fn(async () => ({ id: 42 }));

    expect(await runAction("Failed", body)).toEqual({
      success: true,
      data: { id: 42 },
    });
    expect(body).toHaveBeenCalledWith({
      userId: "user-1",
      name: "Reader",
      db: client,
    });
  });

  it("returns a UserError's message", async () => {
    auth.mockResolvedValue(session);

    const result = await runAction("Failed", async () => {
      throw new UserError("Not a member");
    });

    expect(result).toEqual({ success: false, error: "Not a member" });
  });

  it("hides unexpected errors behind the fallback message", async () => {
    auth.mockResolvedValue(session);

    const result = await runAction("Failed to save", async () => {
      throw { message: 'relation "members" does not exist', code: "42P01" };
    });

    expect(result).toEqual({ success: false, error: "Failed to save" });
    expect(console.error).toHaveBeenCalled();
  });
});
