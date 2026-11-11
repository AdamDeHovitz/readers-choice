import type { Metadata, Viewport } from "next";
import { Inria_Serif, Playfair_Display } from "next/font/google";
import "./globals.css";

const inriaSerif = Inria_Serif({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-inria-serif",
  display: "swap",
});

// Display face for page titles (`font-display`).
const playfairDisplay = Playfair_Display({
  weight: ["400", "700"],
  subsets: ["latin"],
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
