import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted (latin subset, from @fontsource; OFL licenses beside the
// files), so builds never fetch from Google Fonts. next/font/google failed
// Vercel builds whenever Google served a font URL Turbopack can't parse.
const inriaSerif = localFont({
  src: [
    { path: "./fonts/inria-serif-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/inria-serif-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-inria-serif",
  display: "swap",
});

// Display face for page titles (`font-display`).
const playfairDisplay = localFont({
  src: [
    { path: "./fonts/playfair-display-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/playfair-display-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Readers' Choice",
    template: "%s · Readers' Choice",
  },
  description: "Pick, vote on and rank your book club's reads together.",
  applicationName: "Readers' Choice",
  appleWebApp: {
    capable: true,
    title: "Readers' Choice",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets content use the full screen; the shell pads with safe-area insets.
  viewportFit: "cover",
  // Matches the sage top bar, so the browser chrome blends in.
  themeColor: "#949f7f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inriaSerif.variable} ${playfairDisplay.variable}`}
    >
      <body className="font-inria min-h-dvh antialiased">{children}</body>
    </html>
  );
}
