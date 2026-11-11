/**
 * Readers' Choice design tokens, shared by both apps. DESIGN_GUIDE.md explains
 * how to use them.
 *
 * The web declares the same values as CSS variables in
 * apps/web/app/globals.css (Tailwind reads them there); a test in apps/web
 * fails if the two drift. Change a value here and in globals.css together.
 */

/** Raw palette scales. Prefer `colors` (semantic) in components. */
export const palette = {
  rust: {
    50: "#fdf5f3",
    100: "#f9e7e3",
    200: "#f3cfc6",
    300: "#e9a995",
    400: "#d17b60",
    500: "#b96548",
    600: "#994636",
    700: "#7d3729",
    800: "#632c21",
  },
  sage: {
    50: "#f7f8f5",
    100: "#eceee6",
    200: "#d9ddcc",
    300: "#bcc4a6",
    400: "#a9b390",
    500: "#9ea987",
    600: "#949f7f",
    700: "#77806a",
    800: "#5f6655",
  },
  cream: {
    50: "#fdfcf7",
    100: "#efecde",
    200: "#e5e1d0",
  },
  dark: {
    500: "#8a8776",
    600: "#4d4a3d",
    700: "#373420",
    900: "#1d1a05",
  },
} as const;

/** Semantic colors: what a color is for, not what it looks like. */
export const colors = {
  background: palette.cream[100],
  foreground: palette.dark[900],
  card: palette.cream[50],
  cardForeground: palette.dark[900],
  muted: palette.cream[200],
  mutedForeground: palette.dark[600],
  primary: palette.rust[600],
  primaryForeground: palette.cream[50],
  accent: palette.sage[600],
  accentForeground: palette.dark[900],
  /** dark-900 at 12% opacity (the web mixes it in oklab; equivalent here). */
  border: "rgba(29, 26, 5, 0.12)",
  ring: palette.rust[600],
  destructive: "#b42318",
  destructiveForeground: "#ffffff",
} as const;

/**
 * Typefaces. The web self-hosts these (apps/web/app/fonts); the mobile app
 * bundles them from @expo-google-fonts. Weights in use: 400 and 700.
 */
export const fonts = {
  /** Body text and UI. */
  body: "Inria Serif",
  /** Page titles and display text. */
  display: "Playfair Display",
} as const;

export type SemanticColor = keyof typeof colors;
