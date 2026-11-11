import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    template: "%s · GRIT Hub Learning",
    default: "GRIT Hub Learning",
  },
  description: "GRIT Hub learning platform.",
  // Private, invite-only platform: keep it out of search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  // White by default; dark only when chosen in the Display menu.
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-ZA" className={inter.variable}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
