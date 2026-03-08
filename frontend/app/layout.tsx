import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Velocite — Find Your Perfect Home Anywhere",
  description: "AI-powered global real estate search with value scoring and real-time currency conversion.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}