import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { keys } from "@readers-choice/contract/keys";
import { defineContract } from "@readers-choice/contract/operation";
import { UserError } from "@readers-choice/core/user-error";
import { fakeDb } from "@/test/fake-db";
import { executeOperation, implement } from "./operation";
import type { Viewer } from "./viewer";

const contract = defineContract({
  name: "test.double",
  kind: "mutation",
  input: z.object({ n: z.number({ error: "n must be a number" }) }),
  output: z.object({ doubled: z.number() }),
});

const viewer: Viewer = { userId: "user-1", name: "Reader", db: fakeDb([]).db };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("executeOperation", () => {
  it("rejects signed-out callers without running the operation", async () => {
    const run = vi.fn();
    const outcome = await executeOperation(
      implement(contract, "Failed", run),
      null,
      { n: 1 }
    );
    expect(outcome).toEqual({
      result: {
        success: false,
        error: "Unauthorized",
        code: "unauthenticated",
      },
      invalidated: [],
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects input that fails the schema, with the schema's message", async () => {
    const run = vi.fn();
    const op = implement(contract, "Failed", run);
    expect(await executeOperation(op, viewer, { n: "1" })).toEqual({
      result: {
        success: false,
        error: "n must be a number",
        code: "invalid_input",
      },
      invalidated: [],
    });
    for (const bad of [undefined, null, "1", [1]]) {
      const { result } = await executeOperation(op, viewer, bad);
      expect(result).toMatchObject({ success: false, code: "invalid_input" });
    }
    expect(run).not.toHaveBeenCalled();
  });

  it("passes the parsed input and viewer, and returns the output", async () => {
    const op = implement(contract, "Failed", async (ctx, { n }) => {
      expect(ctx.userId).toBe("user-1");
      ctx.invalidate(keys.clubThemes("club-1"));
      return { doubled: n * 2 };
    });
    expect(
      await executeOperation(op, viewer, { n: 2, extra: "dropped" })
    ).toEqual({
      result: { success: true, data: { doubled: 4 } },
      invalidated: [["club", "club-1", "themes"]],
    });
  });

  it("returns a UserError's message and invalidates nothing", async () => {
    const op = implement(contract, "Failed", async (ctx) => {
      ctx.invalidate(keys.clubThemes("club-1"));
      throw new UserError("Only admins can do that");
    });
    expect(await executeOperation(op, viewer, { n: 1 })).toEqual({
      result: {
        success: false,
        error: "Only admins can do that",
        code: "refused",
      },
      invalidated: [],
    });
  });

  it("hides other errors behind the fallback message", async () => {
    const op = implement(contract, "Failed to double", async () => {
      throw new Error("connection refused at 10.0.0.1");
    });
    expect((await executeOperation(op, viewer, { n: 1 })).result).toEqual({
      success: false,
      error: "Failed to double",
      code: "internal",
    });
  });

  it("strips fields the output schema doesn't declare", async () => {
    const op = implement(contract, "Failed", async () => ({
      doubled: 2,
      passwordHash: "secret",
    }));
    expect((await executeOperation(op, viewer, { n: 1 })).result).toEqual({
      success: true,
      data: { doubled: 2 },
    });
  });

  it("fails with the fallback when the output breaks the contract, keeping invalidations", async () => {
    const op = implement(contract, "Failed to double", async (ctx) => {
      ctx.invalidate(keys.clubThemes("club-1"));
      return { doubled: "two" } as unknown as { doubled: number };
    });
    expect(await executeOperation(op, viewer, { n: 1 })).toEqual({
      result: { success: false, error: "Failed to double", code: "internal" },
      invalidated: [["club", "club-1", "themes"]],
    });
    expect(console.error).toHaveBeenCalledWith(
      "test.double returned output that doesn't match its contract:",
      expect.any(Array)
    );
  });
});
