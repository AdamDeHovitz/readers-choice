import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Runs the real scripts against verification files in a scratch repo layout.
const scripts = [
  "check-verification.sh",
  "verification-gaps.sh",
  "verification-sections.pl",
];
const template = readFileSync(
  path.join(__dirname, "..", "verifications", "TEMPLATE.md"),
  "utf8"
);

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

  it("fails an untouched copy of the template on every section", () => {
    const r = check(template);
    expect(r.status).toBe(1);
    for (const s of ["change", "checks", "behavior", "not verified", "harness gaps"]) {
      expect(r.out).toContain(`"## ${s}" is empty`);
    }
    expect(r.out).not.toContain("unclosed");
  });

  it("passes the template filled in with its guidance comments kept", () => {
    const body = template
      .replace(/(## Change\n)/, "$1Votes can be removed.\n")
      .replace(/(## Checks\n)/, "$1- lint: clean\n")
      .replace(/(## Behavior\n)/, "$1As carol, removed the vote; row gone.\n")
      .replace(/(## Not verified\n)/, "$1None.\n")
      .replace(/(## Harness gaps\n)/, "$1None.\n");
    expect(check(body)).toMatchObject({ status: 0 });
  });

  it("strips a comment that spans lines", () => {
    const r = check(file({ behavior: "<!--\nguidance\n-->" }));
    expect(r.status).toBe(1);
    expect(r.out).toContain('"## behavior" is empty');
  });

  it("treats an unclosed <!-- mid-line as text, as GitHub does", () => {
    const midLine = check(file({ behavior: "A stray <!-- in prose." }));
    expect(midLine).toMatchObject({ status: 0 });
    const listItem = check(file({ behavior: "- <!-- hides the rest" }));
    expect(listItem.status).toBe(1);
    expect(listItem.out).toContain("unclosed <!--");
  });

  it("counts non-ASCII text as content", () => {
    expect(check(file({ behavior: "✅ 通過しました" }))).toMatchObject({ status: 0 });
  });

  it("treats <!--> as a complete comment", () => {
    expect(check(file({ behavior: "<!--> Saw it." }))).toMatchObject({ status: 0 });
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

  it("treats <!-- in inline code or a code fence as text", () => {
    const r = check(
      file({
        behavior: "An unclosed `<!--` used to pass.\n```html\n<!-- literal\n```",
      })
    );
    expect(r).toMatchObject({ status: 0 });
  });

  it("keeps a comment's surroundings when it contains backticks", () => {
    const r = check(file({ behavior: "<!-- use `npm run x` -->\nSaw it." }));
    expect(r).toMatchObject({ status: 0 });
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

  it("closes a fence only with the same kind of fence", () => {
    // ``` inside ~~~ and a "```sh" line are both text, not a closing fence.
    const tilde = check(file({ behavior: "~~~\n```\nlog\n~~~" }));
    expect(tilde).toMatchObject({ status: 0 });
    const info = check(file({ behavior: "```\nlog\n```sh\nmore\n```" }));
    expect(info).toMatchObject({ status: 0 });
  });

  it("doesn't treat indented or inline triple backticks as a fence", () => {
    const indented = check(file({ behavior: "Saw it.\n    ```" }));
    expect(indented).toMatchObject({ status: 0 });
    const inline = check(file({ checks: "```npm run lint``` clean" }));
    expect(inline).toMatchObject({ status: 0 });
  });

  it("accepts a heading indented by up to three spaces", () => {
    const body = file().replace("## Checks", "   ## Checks");
    expect(check(body)).toMatchObject({ status: 0 });
  });

  it("fails on a duplicated section", () => {
    const r = check(file() + "## Change\nagain\n");
    expect(r.status).toBe(1);
    expect(r.out).toContain("appears 2 times");
  });
});

describe("verification-gaps.sh", () => {
  it("rejects a count that isn't a positive number", () => {
    expect(run("verification-gaps.sh", "0").status).toBe(2);
  });

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
