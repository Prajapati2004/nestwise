import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NestWise — Find smarter. Move better. Stay protected.",
  description:
    "Verified listings, scam detection, true cost calculator, and an AI real estate advisor — all in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
