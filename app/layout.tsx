import type { Metadata } from "next";
import { Inria_Serif, Playfair_Display } from "next/font/google";
import "./globals.css";

// Load Inria Serif from Google Fonts
const inriaSerif = Inria_Serif({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-inria",
  display: "swap",
});

// Load Playfair Display as an alternative to Voga (similar elegant serif display font)
// Voga is not available on Google Fonts, so using Playfair Display which has similar characteristics
const playfairDisplay = Playfair_Display({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-voga",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Readers' Choice",
  description: "A joyful book club community platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inriaSerif.variable} ${playfairDisplay.variable}`}>
      <body className="antialiased font-inria">
        {children}
      </body>
    </html>
  );
}
