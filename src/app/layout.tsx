import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Event Registration",
  description: "Browse and register for events",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
