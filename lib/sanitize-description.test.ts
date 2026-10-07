import { describe, it, expect } from "vitest";
import { sanitizeDescription, stripHtmlTags } from "./sanitize-description";

// Any "<" left in the output must start one of these bare tags
const SAFE_TAG = /^<\/?(p|br|i|b|em|strong)>/;

function expectOnlySafeTags(html: string) {
  for (let i = html.indexOf("<"); i !== -1; i = html.indexOf("<", i + 1)) {
    expect(html.slice(i)).toMatch(SAFE_TAG);
  }
}

describe("sanitizeDescription", () => {
  it("returns empty string for empty input", () => {
    expect(sanitizeDescription(null)).toBe("");
    expect(sanitizeDescription(undefined)).toBe("");
    expect(sanitizeDescription("")).toBe("");
  });

  it("keeps allowed tags and strips their attributes", () => {
    expect(
      sanitizeDescription('<p class="x" onclick="evil()">Hi <b>there</b></p>')
    ).toBe("<p>Hi <b>there</b></p>");
    expect(sanitizeDescription("a<br/>b<BR>c<br />d")).toBe("a<br>b<br>c<br>d");
  });

  it("does not treat tags that merely start with an allowed name as allowed", () => {
    expect(sanitizeDescription("<bold>x</bold>")).toBe(
      "&lt;bold&gt;x&lt;/bold&gt;"
    );
  });

  it("removes script and style blocks", () => {
    expect(
      sanitizeDescription("a<script>alert(1)</script>b<style>p{}</style>c")
    ).toBe("abc");
  });

  it.each([
    "<img src=x onerror=alert(1)>",
    "<<x>img src=x onerror=alert(1)>",
    "<<script>script>alert(1)<</script>/script>",
    "&lt;&lt;x&gt;svg onload=alert(1)&gt;",
    "&lt;img src=x onerror=alert(1)&gt;",
    '<a href="javascript:alert(1)">x</a>',
    "<svg><p onmouseover=alert(1)>x</p></svg>",
    "<p\nonclick=alert(1)>x</p>",
    "<img src=x onerror=alert(1)",
    "<iframe srcdoc='<script>alert(1)</script>'>",
  ])("neutralizes %s", (payload) => {
    expectOnlySafeTags(sanitizeDescription(payload));
  });

  it("decodes entities exactly once", () => {
    expect(sanitizeDescription("&amp;lt;b&amp;gt;")).toBe("&amp;lt;b&amp;gt;");
    expect(sanitizeDescription("Tom &amp; Jerry&#8217;s")).toBe(
      "Tom &amp; Jerry&#39;s"
    );
  });

  it("renders encoded allowed tags as markup", () => {
    expect(sanitizeDescription("&lt;i&gt;Dune&lt;/i&gt;")).toBe("<i>Dune</i>");
  });
});

describe("stripHtmlTags", () => {
  it("returns plain text", () => {
    expect(stripHtmlTags("<p>Hello<br>world &amp; <b>more</b></p>")).toBe(
      "Hello world & more"
    );
  });
});
