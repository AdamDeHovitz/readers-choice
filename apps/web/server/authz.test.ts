import { describe, expect, it } from "vitest";
import { fakeDb } from "@/test/fake-db";
import {
  getMembership,
  isSuperAdmin,
  requireAdmin,
  withoutAdminPowers,
} from "./authz";

const adminRow = { data: { is_admin: true } };

describe("withoutAdminPowers", () => {
  it("leaves admin powers alone outside it", async () => {
    const { db } = fakeDb([adminRow, { data: { is_super_admin: true } }]);
    expect(await getMembership(db, "club-1", "user-1")).toEqual({
      isAdmin: true,
    });
    expect(await isSuperAdmin(db, "user-1")).toBe(true);
  });

  it("treats admins and super admins as ordinary members inside it, and says so", async () => {
    const { db } = fakeDb([adminRow, { data: { is_super_admin: true } }]);
    const { result, withheld } = await withoutAdminPowers(async () => [
      await getMembership(db, "club-1", "user-1"),
      await isSuperAdmin(db, "user-1"),
    ]);
    expect(result).toEqual([{ isAdmin: false }, false]);
    expect(withheld).toBe(true);
  });

  it("refuses requireAdmin for a real admin, and reports nothing withheld for a non-admin", async () => {
    const admin = fakeDb([adminRow]);
    const asAdmin = await withoutAdminPowers(() =>
      requireAdmin(admin.db, "club-1", "user-1").catch((e: Error) => e.message)
    );
    expect(asAdmin).toEqual({
      result: "Only admins can do this",
      withheld: true,
    });

    const member = fakeDb([{ data: { is_admin: false } }]);
    const asMember = await withoutAdminPowers(() =>
      getMembership(member.db, "club-1", "user-2")
    );
    expect(asMember).toEqual({ result: { isAdmin: false }, withheld: false });
  });

  it("keeps concurrent work separate", async () => {
    const { db } = fakeDb([adminRow, adminRow]);
    const [inside, outside] = await Promise.all([
      withoutAdminPowers(() => getMembership(db, "club-1", "user-1")),
      getMembership(db, "club-1", "user-1"),
    ]);
    expect(inside.result).toEqual({ isAdmin: false });
    expect(outside).toEqual({ isAdmin: true });
  });
});
