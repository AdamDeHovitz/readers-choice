import { colors, palette } from "@readers-choice/tokens";
import { fontFamily } from "./fonts";

export { colors, palette, fontFamily };

/** Spacing steps in points, matching the web's 4px Tailwind scale. */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

/** Corner radii, matching the web's rounded-lg/xl/2xl/3xl. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/** Text styles. Sizes follow the web's Tailwind text-sm…text-5xl. */
export const type = {
  caption: { fontFamily: fontFamily.body, fontSize: 14, lineHeight: 20 },
  body: { fontFamily: fontFamily.body, fontSize: 16, lineHeight: 24 },
  bodyBold: { fontFamily: fontFamily.bodyBold, fontSize: 16, lineHeight: 24 },
  lead: { fontFamily: fontFamily.body, fontSize: 18, lineHeight: 28 },
  eyebrow: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: { fontFamily: fontFamily.display, fontSize: 30, lineHeight: 36 },
  hero: { fontFamily: fontFamily.display, fontSize: 48, lineHeight: 50 },
} as const;

export type TextVariant = keyof typeof type;
