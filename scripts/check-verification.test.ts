import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Runs the real scripts against verification files in a scratch repo layout.
const scripts = [
  "check-verification.sh",
  "verification-gaps.sh",
  "verification-sections.awk",
];

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "verification-"));
  mkdirSync(path.join(root, "scripts"));
  mkdirSync(path.join(root, "verifications"));
  for (const s of scripts) {
    copyFileSync(path.join(__dirname, s), path.join(root, "scripts", s));
  }
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

function run(script: string, ...args: string[]) {
  const r = spawnSync("bash", [path.join(root, "scripts", script), ...args], {
    encoding: "utf8",
  });
  return { status: r.status, out: r.stdout + r.stderr };
}

function check(body: string, pr = "7") {
  writeFileSync(path.join(root, "verifications", `${pr}.md`), body);
  return run("check-verification.sh", pr);
}

const filled = {
  change: "Votes can be removed.",
  checks: "- `npm run test:run`: 294 passed",
  behavior: "As carol, pressed Remove Vote; the row is gone.",
  notVerified: "None.",
  harnessGaps: "None.",
};

function file(parts: Partial<typeof filled> = {}, sep = "\n") {
  const p = { ...filled, ...parts };
  return [
    "# Verification: test",
    "",
    "## Change",
    p.change,
    "## Checks",
    p.checks,
    "## Behavior",
    p.behavior,
    "## Not verified",
    p.notVerified,
    "## Harness gaps",
    p.harnessGaps,
    "",
  ].join(sep);
}

describe("check-verification.sh", () => {
  it("passes a filled-in file", () => {
    expect(check(file())).toMatchObject({ status: 0 });
  });

  it("fails when the file is missing", () => {
    const r = run("check-verification.sh", "7");
    expect(r.status).toBe(1);
    expect(r.out).toContain("Missing verifications/7.md");
  });

  it("rejects a PR argument that isn't a number", () => {
    check(file());
    expect(run("check-verification.sh", "../verifications/7").status).toBe(2);
  });

  it("treats the template's comments as empty", () => {
    const r = check(file({ behavior: "<!-- what you did -->" }));
    expect(r.status).toBe(1);
    expect(r.out).toContain('"## behavior" is empty');
  });

  it("treats punctuation and ### headings alone as empty", () => {
    const r = check(file({ behavior: "-\n---\n> .\n### Sub" }));
    expect(r.status).toBe(1);
    expect(r.out).toContain('"## behavior" is empty');
  });

  it("fails on an unclosed comment, which hides the rest on GitHub", () => {
    const r = check(file({ behavior: "<!-- oops\nreal evidence" }));
    expect(r.status).toBe(1);
    expect(r.out).toContain("unclosed <!--");
  });

  it("accepts CRLF line endings", () => {
    expect(check(file({}, "\r\n"))).toMatchObject({ status: 0 });
  });

  it("matches headings regardless of case and closing hashes", () => {
    const body = file().replace("## Checks", "## checks ##");
    expect(check(body)).toMatchObject({ status: 0 });
  });

  it("ignores headings and shell comments inside code fences", () => {
    const fencedHeading = check(
      file({ change: "```\n## Checks\n```" }).replace(/## Checks\n.*\n/, "")
    );
    expect(fencedHeading.status).toBe(1);
    expect(fencedHeading.out).toContain('missing section "## checks"');

    const shellComment = check(
      file({ behavior: "```sh\n# reproduce\nnpm run x\n```\nIt worked." })
    );
    expect(shellComment.status).toBe(0);
  });

  it("fails on a duplicated section", () => {
    const r = check(file() + "## Change\nagain\n");
    expect(r.status).toBe(1);
    expect(r.out).toContain("appears 2 times");
  });
});

describe("verification-gaps.sh", () => {
  it("says so when there are no files", () => {
    expect(run("verification-gaps.sh")).toMatchObject({
      status: 0,
      out: "No verification files yet.\n",
    });
  });

  it("prints only the gap sections, newest PR first, code blocks intact", () => {
    check(file({ notVerified: "- old gap" }), "9");
    check(
      file({
        notVerified: "- a\n```sh\n# reproduce\nnpm run x\n```\n- b",
        harnessGaps: "- slow seed",
      }),
      "10"
    );
    const r = run("verification-gaps.sh");
    expect(r.status).toBe(0);
    expect(r.out).toBe(
      [
        "",
        "#10 not verified",
        "  - a",
        "  ```sh",
        "  # reproduce",
        "  npm run x",
        "  ```",
        "  - b",
        "",
        "#10 harness gaps",
        "  - slow seed",
        "",
        "#9 not verified",
        "  - old gap",
        "",
        "#9 harness gaps",
        "  None.",
        "",
      ].join("\n")
    );
  });
});
