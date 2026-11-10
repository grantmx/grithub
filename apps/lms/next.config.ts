import path from "node:path";
import type { NextConfig } from "next";
import { NO_STORE_PATHS, securityHeaders } from "./lib/securityHeaders";

// eslint-disable-next-line turbo/no-undeclared-env-vars -- NODE_ENV is set by Next itself
const dev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Workspace packages ship TypeScript/JSX source; let Next compile them.
  transpilePackages: ["db"],
  // Monorepo root (two levels up), so stray lockfiles elsewhere on a machine
  // can't change how workspace packages resolve.
  turbopack: { root: path.join(__dirname, "..", "..") },
  // Server actions: same-origin only (Next's default Origin check) and a
  // 1 MB body cap, stated explicitly (CSV imports are the largest payload).
  experimental: {
    serverActions: { bodySizeLimit: "1mb" },
  },
  async headers() {
    // Assessment papers, results, replays, staff/admin views and evidence are
    // never stored by browsers or shared caches (no answer keys in caches).
    const noStore = [{ key: "Cache-Control", value: "private, no-store" }];
    return [
      { source: "/:path*", headers: securityHeaders({ dev }) },
      ...NO_STORE_PATHS.map((source) => ({ source, headers: noStore })),
    ];
  },
};

export default nextConfig;
