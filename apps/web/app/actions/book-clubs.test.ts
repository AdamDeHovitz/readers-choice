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

import { viewerIsSuperAdmin } from "@/server/authz";
import { createAdminClient } from "@/server/db";
import { deleteBookClub } from "./book-clubs";

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
      success: false,
      error: "Unauthorized",
      code: "unauthenticated",
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
      success: false,
      error: "Only super admins can delete book clubs",
      code: "refused",
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

  it("fails closed, without leaking the cause, if the role lookup fails", async () => {
    maybeSingle.mockResolvedValue({
      data: { is_super_admin: true },
      error: { message: "Lookup failed" },
    });
    expect(await deleteBookClub("club-id", "Spam Club")).toEqual({
      success: false,
      error: "Failed to delete book club",
      code: "internal",
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
      data: undefined,
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
    rpc.mockResolvedValue({ error: { message, code: "P0001" } });
    expect(await deleteBookClub("club-id", "Spam Club")).toEqual({
      success: false,
      error: message,
      code: "refused",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("hides unexpected database failures", async () => {
    maybeSingle.mockResolvedValue({
      data: { is_super_admin: true },
      error: null,
    });
    rpc.mockResolvedValue({
      error: { message: "connection reset", code: "08006" },
    });
    expect(await deleteBookClub("club-id", "Spam Club")).toEqual({
      success: false,
      error: "Failed to delete book club",
      code: "internal",
    });
  });
});

describe("super-admin control visibility", () => {
  const viewer = () => ({
    userId: session.user.id,
    name: "Reader",
    db: createAdminClient(),
  });

  it("is false for signed-out visitors", async () => {
    expect(await viewerIsSuperAdmin(null)).toBe(false);
  });

  it("is false for ordinary users and true for a database-assigned super admin", async () => {
    expect(await viewerIsSuperAdmin(viewer())).toBe(false);
    maybeSingle.mockResolvedValue({
      data: { is_super_admin: true },
      error: null,
    });
    expect(await viewerIsSuperAdmin(viewer())).toBe(true);
  });

  it("is false when the role cannot be read", async () => {
    maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "Unavailable" },
    });
    expect(await viewerIsSuperAdmin(viewer())).toBe(false);
  });
});
