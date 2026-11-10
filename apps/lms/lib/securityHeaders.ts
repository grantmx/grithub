/**
 * HTTP security headers for every LMS response (next.config.ts). Kept here,
 * not inline in the config, so test/securityHeaders.test.ts can check them.
 *
 * Content-Security-Policy notes:
 * - script-src needs 'unsafe-inline': Next.js App Router streams its RSC
 *   payload in inline <script> tags, and nonces would force every page to
 *   render dynamically. XSS is mitigated at the source instead: Markdown is a
 *   restricted subset with no raw HTML (lib/markdown.tsx), React escapes all
 *   text, and the app never injects raw HTML (checked by the test).
 * - Mux (hosted audio/video): player assets are bundled; playback streams
 *   from *.mux.com, posters from image.mux.com, Mux Data beacons to litix.io.
 *   hls.js runs in a blob: worker.
 * - Vercel Blob: browsers upload evidence and learner guides straight to
 *   vercel.com/api/blob; evidence images load from signed links on
 *   *.blob.vercel-storage.com (via /evidence/:id redirects).
 * - img-src allows any https: image because staff-authored Markdown may
 *   reference images by https URL (lib/markdown.tsx only allows https or /).
 */

type Header = { key: string; value: string };

export function contentSecurityPolicy(opts: { dev: boolean }): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(opts.dev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "media-src": ["'self'", "blob:", "https://*.mux.com"],
    "connect-src": [
      "'self'",
      "https://*.mux.com",
      "https://*.litix.io",
      "https://vercel.com/api/blob/",
      "https://*.blob.vercel-storage.com",
      ...(opts.dev ? ["ws:"] : []),
    ],
    "worker-src": ["'self'", "blob:"],
    "frame-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "manifest-src": ["'self'"],
  };
  const parts = Object.entries(directives).map(
    ([k, v]) => `${k} ${v.join(" ")}`,
  );
  if (!opts.dev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

export function securityHeaders(opts: { dev: boolean }): Header[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(opts) },
    // Two years; browsers only honour it over HTTPS (ignored on localhost).
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    {
      key: "Permissions-Policy",
      value: [
        "camera=()",
        "microphone=()",
        "geolocation=()",
        "payment=()",
        "usb=()",
        "serial=()",
        "bluetooth=()",
        "browsing-topics=()",
        "fullscreen=(self)",
        "publickey-credentials-get=(self)",
        "publickey-credentials-create=(self)",
      ].join(", "),
    },
  ];
}

/** Pages that must never be stored by browsers or shared caches (papers, results, staff views). */
export const NO_STORE_PATHS = [
  "/learn/attempt/:path*",
  "/learn/assessment/:path*",
  "/staff/:path*",
  "/admin/:path*",
  "/account/:path*",
  "/evidence/:path*",
  "/setup/:path*",
] as const;
