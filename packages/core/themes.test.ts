import { describe, expect, it } from "vitest";
import { themeDeletionBlocker } from "./themes";

const me = { userId: "me", isAdmin: false };
const admin = { userId: "me", isAdmin: true };
const unused = (submittedBy: string | null) => ({ submittedBy, timesUsed: 0 });

describe("themeDeletionBlocker", () => {
  it("lets the submitter or an admin delete an unused theme", () => {
    expect(themeDeletionBlocker(unused("me"), me)).toBeNull();
    expect(themeDeletionBlocker(unused("someone-else"), admin)).toBeNull();
    expect(themeDeletionBlocker(unused(null), admin)).toBeNull();
  });

  it("blocks other members", () => {
    expect(themeDeletionBlocker(unused("someone-else"), me)).toBe(
      "You can only delete themes you submitted or be an admin"
    );
    expect(themeDeletionBlocker(unused(null), me)).not.toBeNull();
  });

  it("blocks everyone once a meeting uses the theme", () => {
    const used = { submittedBy: "me", timesUsed: 1 };
    expect(themeDeletionBlocker(used, admin)).toBe(
      "Cannot delete theme that has been used in meetings"
    );
  });
});
