import type { Metadata } from "next";
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
      <body className="noise bg-bg font-sans text-textMain">{children}</body>
    </html>
  );
}
