import type { Metadata } from "next";
import "@/styles/globals.css";
import "@/features/home-arena/styles/homeArena.css";

export const metadata: Metadata = {
  title: "Omniversus",
  description: "AI-simulated cross-universe battles.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
