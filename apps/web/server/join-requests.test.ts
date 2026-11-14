import { describe, expect, it } from "vitest";
import { fakeDb } from "@/test/fake-db";
import { getViewerJoinRequest } from "./join-requests";

const CLUB = "22222222-0000-4000-8000-000000000001";
const now = new Date("2026-11-13T12:00:00Z");

async function requestFrom(row: unknown) {
  const { db } = fakeDb([{ data: row }]);
  return getViewerJoinRequest(db, CLUB, "me", now);
}

describe("getViewerJoinRequest", () => {
  it("is none without a request", async () => {
    expect(await requestFrom(null)).toEqual({ status: "none" });
  });

  it("shows a pending request and its note", async () => {
    expect(
      await requestFrom({ status: "pending", message: "Hi", decided_at: null })
    ).toEqual({ status: "pending", message: "Hi" });
  });

  it("holds a declined requester off for 30 days", async () => {
    expect(
      await requestFrom({
        status: "declined",
        message: null,
        decided_at: "2026-11-01T12:00:00Z",
      })
    ).toEqual({
      status: "cooldown",
      canRequestAgainAt: "2026-12-01T12:00:00.000Z",
    });
  });

  it("lets them ask again once the cooldown has passed", async () => {
    expect(
      await requestFrom({
        status: "declined",
        message: null,
        decided_at: "2026-10-01T12:00:00Z",
      })
    ).toEqual({ status: "none" });
  });
});
