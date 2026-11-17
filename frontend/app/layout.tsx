import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "VeloCite — Real Estate Search in Azerbaijan",
  description: "Search apartments and houses in Baku and across Azerbaijan with value scoring, market analytics and prices in AZN.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
