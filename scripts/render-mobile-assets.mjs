#!/usr/bin/env node
// Renders the mobile app's icon, splash and favicon PNGs from the website's
// icon (apps/web/app/icon.svg), so both apps share one source of truth.
// Run after changing the icon: node scripts/render-mobile-assets.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(path.join(root, "apps/web/app/icon.svg"), "utf8");
const out = (name) => path.join(root, "apps/mobile/assets", name);

// The book glyph alone, for Android's adaptive icon, which draws it over
// the brand color. Keeping the full 512 viewBox leaves the book inside the
// central 66% that Android never crops.
const glyph = svg.replace(/<rect[^>]*\/>/, "");
// iOS rounds icon corners itself, so the tile is square.
const tile = svg.replace(/ rx="\d+"/, "");

const assets = [
  { name: "icon.png", size: 1024, markup: tile },
  { name: "favicon.png", size: 48, markup: svg },
  { name: "adaptive-icon.png", size: 1024, markup: glyph, transparent: true },
  { name: "splash-icon.png", size: 512, markup: svg, transparent: true },
];

const browser = await chromium.launch();
for (const { name, size, markup, transparent } of assets) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
  });
  const sized = markup.replace(
    "<svg ",
    `<svg width="${size}" height="${size}" `
  );
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${sized}</body></html>`
  );
  await page.screenshot({ path: out(name), omitBackground: !!transparent });
  await page.close();
  console.log(`apps/mobile/assets/${name} (${size}px)`);
}
await browser.close();
