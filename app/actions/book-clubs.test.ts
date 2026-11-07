import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";

const { auth, from, rpc, maybeSingle, revalidatePath, eq, select } = vi.hoisted(
  () => ({
    auth: vi.fn<() => Promise<Session | null>>(),
    from: vi.fn(),
    rpc: vi.fn(),
    maybeSingle: vi.fn(),
    revalidatePath: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
  })
);

vi.mock("@/auth", () => ({ auth }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from, rpc }),
}));

import { deleteBookClub, getCurrentUserIsSuperAdmin } from "./book-clubs";

const session: Session = {
  user: { id: "actor-id", name: "Reader", email: "reader@example.test" },
  expires: "2099-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy";
  auth.mockResolvedValue(session);
  from.mockReturnValue({ select });
  select.mockReturnValue({ eq });
  eq.mockReturnValue({ maybeSingle });
  maybeSingle.mockResolvedValue({
    data: { is_super_admin: false },
    error: null,
  });
  rpc.mockResolvedValue({ error: null });
});

describe("super-admin club deletion", () => {
  it("rejects unauthenticated deletion without accessing the database", async () => {
    auth.mockResolvedValue(null);
    expect(await deleteBookClub("club-id", "Spam Club")).toEqual({
      error: "Unauthorized",
    });
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects regular club admins even if their session claims a global role", async () => {
    auth.mockResolvedValue({
      ...session,
      user: { ...session.user, is_super_admin: true },
    } as Session);
    expect(await deleteBookClub("club-id", "Spam Club")).toEqual({
      error: "Only super admins can delete book clubs",
    });
    expect(from).toHaveBeenCalledWith("users");
    expect(eq).toHaveBeenCalledWith("id", session.user.id);
    expect(rpc).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a session whose user no longer exists", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await deleteBookClub("club-id", "Spam Club")).toHaveProperty(
      "error"
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails closed if the role lookup fails", async () => {
    maybeSingle.mockResolvedValue({
      data: { is_super_admin: true },
      error: { message: "Lookup failed" },
    });
    expect(await deleteBookClub("club-id", "Spam Club")).toEqual({
      error: "Lookup failed",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("allows a global super admin to delete without club membership", async () => {
    maybeSingle.mockResolvedValue({
      data: { is_super_admin: true },
      error: null,
    });
    expect(await deleteBookClub("club-id", "Spam Club")).toEqual({
      success: true,
    });
    expect(from).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("delete_book_club", {
      p_actor_id: "actor-id",
      p_book_club_id: "club-id",
      p_confirmation_name: "Spam Club",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/browse");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/book-clubs/club-id",
      "layout"
    );
    expect(revalidatePath).toHaveBeenCalledWith("/meetings", "layout");
  });

  it.each([
    "Only super admins can delete book clubs",
    "Book club not found",
    "Type the book club name exactly to confirm deletion",
  ])("returns database rejection: %s", async (message) => {
    maybeSingle.mockResolvedValue({
      data: { is_super_admin: true },
      error: null,
    });
    rpc.mockResolvedValue({ error: { message } });
    expect(await deleteBookClub("club-id", "Spam Club")).toEqual({
      error: message,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("super-admin control visibility", () => {
  it("is false for signed-out visitors", async () => {
    auth.mockResolvedValue(null);
    expect(await getCurrentUserIsSuperAdmin()).toBe(false);
  });

  it("is false for ordinary users and true for a database-assigned super admin", async () => {
    expect(await getCurrentUserIsSuperAdmin()).toBe(false);
    maybeSingle.mockResolvedValue({
      data: { is_super_admin: true },
      error: null,
    });
    expect(await getCurrentUserIsSuperAdmin()).toBe(true);
  });

  it("is false when the role cannot be read", async () => {
    maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "Unavailable" },
    });
    expect(await getCurrentUserIsSuperAdmin()).toBe(false);
  });
});
