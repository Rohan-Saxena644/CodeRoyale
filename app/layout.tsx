import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeRoyale",
  description: "Realtime 1v1 coding duels with competitive and developer challenge modes."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="noise bg-ink font-sans text-mist">{children}</body>
    </html>
  );
}
