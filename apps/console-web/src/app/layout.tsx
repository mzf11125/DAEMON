import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daemon — Operational Cockpit",
  description: "Signal and case management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
