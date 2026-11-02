import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeRoyale",
  description: "Real-time 1v1 competitive coding duels."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-bg font-sans text-textMain">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
