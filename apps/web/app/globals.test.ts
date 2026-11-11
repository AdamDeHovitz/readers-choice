import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { colors, palette } from "@readers-choice/tokens";

// globals.css is the web's copy of the shared design tokens (Tailwind reads
// CSS variables). These tests keep it identical to @readers-choice/tokens,
// which the mobile app uses.
const css = readFileSync(path.join(__dirname, "globals.css"), "utf8");
const variable = (name: string) =>
  new RegExp(`--${name}:\\s*([^;]+);`).exec(css)?.[1].trim();

const kebab = (name: string) =>
  name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

describe("globals.css matches @readers-choice/tokens", () => {
  it("has every palette color with the same value", () => {
    for (const [scale, shades] of Object.entries(palette)) {
      for (const [shade, hex] of Object.entries(shades)) {
        expect(variable(`color-${scale}-${shade}`), `${scale}-${shade}`).toBe(
          hex
        );
      }
    }
  });

  it("has no palette colors the tokens lack", () => {
    const declared = [...css.matchAll(/--color-([a-z]+)-(\d+):/g)].map(
      ([, scale, shade]) => `${scale}-${shade}`
    );
    const known = Object.entries(palette).flatMap(([scale, shades]) =>
      Object.keys(shades).map((shade) => `${scale}-${shade}`)
    );
    expect(declared.sort()).toEqual(known.sort());
  });

  it("maps each semantic color to the same palette color", () => {
    const hexToVar = new Map<string, string>(
      Object.entries(palette).flatMap(([scale, shades]) =>
        Object.entries(shades).map(([shade, hex]) => [
          hex,
          `var(--color-${scale}-${shade})`,
        ])
      )
    );
    for (const [name, value] of Object.entries(colors)) {
      const declared = variable(kebab(name));
      if (name === "border") {
        expect(declared).toBe(
          "color-mix(in oklab, var(--color-dark-900) 12%, transparent)"
        );
        continue;
      }
      expect(declared, name).toBe(hexToVar.get(value) ?? value);
    }
  });
});
