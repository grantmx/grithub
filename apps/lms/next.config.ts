import path from "node:path";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Workspace packages ship TypeScript/JSX source; let Next compile them.
  transpilePackages: ["ui", "db"],
  // Monorepo root (two levels up), so stray lockfiles elsewhere on a machine
  // can't change how workspace packages resolve.
  turbopack: { root: path.join(__dirname, "..", "..") },
  async headers() {
    // Assessment papers, results and replays are never stored by browsers or
    // shared caches (no answer keys in cached pages).
    const noStore = [{ key: "Cache-Control", value: "private, no-store" }];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/learn/attempt/:path*", headers: noStore },
      { source: "/learn/assessment/:path*", headers: noStore },
      { source: "/staff/:path*", headers: noStore },
    ];
  },
};

export default nextConfig;
