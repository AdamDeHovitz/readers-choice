import { describe, it, expect } from "vitest";
import { normalizeApiHtml, normalizeApiText } from "./normalize-text";

/**
 * Windows-1252 bytes 0x80-0x9F that differ from Latin-1 (written as literal
 * characters, independently of the table in the implementation). Node's
 * TextDecoder treats "windows-1252" as Latin-1, so it can't be used here.
 */
const CP1252_OVERRIDES: Record<number, string> = {
  0x80: "€",
  0x82: "‚",
  0x83: "ƒ",
  0x84: "„",
  0x85: "…",
  0x86: "†",
  0x87: "‡",
  0x88: "ˆ",
  0x89: "‰",
  0x8a: "Š",
  0x8b: "‹",
  0x8c: "Œ",
  0x8e: "Ž",
  0x91: "‘",
  0x92: "’",
  0x93: "“",
  0x94: "”",
  0x95: "•",
  0x96: "–",
  0x97: "—",
  0x98: "˜",
  0x99: "™",
  0x9a: "š",
  0x9b: "›",
  0x9c: "œ",
  0x9e: "ž",
  0x9f: "Ÿ",
};

/** Garble text the way a UTF-8 -> Windows-1252 mis-decode does. */
function garbleCp1252(text: string): string {
  return [...Buffer.from(text, "utf8")]
    .map((byte) => CP1252_OVERRIDES[byte] ?? String.fromCharCode(byte))
    .join("");
}

/** Garble text the way a UTF-8 -> Latin-1 mis-decode does. */
function garbleLatin1(text: string): string {
  return Buffer.from(text, "utf8").toString("latin1");
}

const PUNCTUATION: Array<[name: string, original: string, expected: string]> = [
  ["right single quote", "’", "'"],
  ["left single quote", "‘", "'"],
  ["left double quote", "“", '"'],
  ["right double quote", "”", '"'],
  ["em dash", "—", "—"],
  ["en dash", "–", "–"],
  ["ellipsis", "…", "…"],
];

const ACCENTED = "àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿÀÁÂÄÇÈÉÊËÍÑÓÖÜß";

describe("normalizeApiText", () => {
  it("derives the expected mojibake sequences (sanity check of the helpers)", () => {
    expect(garbleCp1252("—")).toBe("â€”");
    expect(garbleCp1252("–")).toBe("â€“");
    expect(garbleCp1252("…")).toBe("â€¦");
    expect(garbleCp1252("’")).toBe("â€™");
    expect(garbleCp1252("“")).toBe("â€œ");
    expect(garbleCp1252("”")).toBe("â€\u009d");
    expect(garbleLatin1("—")).toBe("â\u0080\u0094");
  });

  describe.each(PUNCTUATION)("%s", (_name, original, expected) => {
    it("repairs the Windows-1252 mojibake", () => {
      const garbled = garbleCp1252(original);
      expect(normalizeApiText(`a${garbled}b`)).toBe(`a${expected}b`);
    });

    it("repairs the Latin-1 mojibake", () => {
      const garbled = garbleLatin1(original);
      expect(normalizeApiText(`a${garbled}b`)).toBe(`a${expected}b`);
    });

    it("repairs double-encoded mojibake", () => {
      const garbled = garbleCp1252(garbleCp1252(original));
      expect(normalizeApiText(`a${garbled}b`)).toBe(`a${expected}b`);
    });

    it("leaves the correctly encoded character alone", () => {
      expect(normalizeApiText(`a${original}b`)).toBe(`a${original}b`);
    });
  });

  it.each(ACCENTED.split(""))("repairs mojibake for %s", (ch) => {
    expect(normalizeApiText(`x${garbleCp1252(ch)}x`)).toBe(`x${ch}x`);
    expect(normalizeApiText(`x${garbleLatin1(ch)}x`)).toBe(`x${ch}x`);
    expect(normalizeApiText(`x${garbleCp1252(garbleCp1252(ch))}x`)).toBe(
      `x${ch}x`
    );
    expect(normalizeApiText(`x${ch}x`)).toBe(`x${ch}x`);
  });

  it("repairs a realistic garbled sentence", () => {
    const original = "It’s “the” novel—a café classic… pages 10–20";
    expect(normalizeApiText(garbleCp1252(original))).toBe(
      'It\'s "the" novel—a café classic… pages 10–20'
    );
  });

  it("repairs a right double quote whose final byte was dropped", () => {
    expect(normalizeApiText("He said â€helloâ€")).toBe('He said "hello"');
  });

  it("keeps the legacy à fallback with a plain space", () => {
    expect(normalizeApiText("voilÃ ")).toBe("voilà");
  });

  it("replaces generic replacement-character patterns with an apostrophe", () => {
    expect(normalizeApiText("donâ??t")).toBe("don't");
    expect(normalizeApiText("donâ¿¿t")).toBe("don't");
    expect(normalizeApiText("don�t")).toBe("don't");
  });

  it("trims and collapses whitespace", () => {
    expect(normalizeApiText("  a \n\t b  ")).toBe("a b");
  });

  it("returns null for empty input", () => {
    expect(normalizeApiText(null)).toBeNull();
    expect(normalizeApiText(undefined)).toBeNull();
    expect(normalizeApiText("")).toBeNull();
  });

  it("leaves clean ASCII untouched", () => {
    expect(normalizeApiText("A plain description.")).toBe(
      "A plain description."
    );
  });
});

describe("normalizeApiHtml", () => {
  it("decodes typographic HTML entities", () => {
    expect(
      normalizeApiHtml(
        "<p>&ldquo;Hi&rdquo; &lsquo;x&rsquo; a&mdash;b 1&ndash;2&hellip;</p>"
      )
    ).toBe("<p>\"Hi\" 'x' a—b 1–2…</p>");
  });

  it("fixes mojibake inside HTML", () => {
    expect(normalizeApiHtml(`<b>${garbleCp1252("—")}</b>`)).toBe("<b>—</b>");
  });

  it("returns null for empty input", () => {
    expect(normalizeApiHtml(null)).toBeNull();
    expect(normalizeApiHtml("   ")).toBeNull();
  });
});
