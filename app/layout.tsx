import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
