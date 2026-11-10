import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  NO_STORE_PATHS,
  contentSecurityPolicy,
  securityHeaders,
} from "@/lib/securityHeaders";

const root = path.resolve(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory())
      return name === "node_modules" ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe("security headers", () => {
  const prod = Object.fromEntries(
    securityHeaders({ dev: false }).map((h) => [h.key, h.value]),
  );

  it("sends the baseline headers", () => {
    expect(prod["Strict-Transport-Security"]).toMatch(/max-age=\d{8,}/);
    expect(prod["X-Content-Type-Options"]).toBe("nosniff");
    expect(prod["X-Frame-Options"]).toBe("DENY");
    expect(prod["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(prod["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(prod["Permissions-Policy"]).toContain("camera=()");
    expect(prod["Permissions-Policy"]).toContain(
      "publickey-credentials-get=(self)",
    );
  });

  it("has a CSP that blocks framing, plugins and foreign forms", () => {
    const csp = prod["Content-Security-Policy"]!;
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("only allows eval and websockets in development", () => {
    const dev = contentSecurityPolicy({ dev: true });
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).not.toContain("upgrade-insecure-requests");
  });

  it("never caches papers, staff, admin or evidence pages", () => {
    for (const p of [
      "/learn/attempt/",
      "/learn/assessment/",
      "/staff/",
      "/admin/",
      "/evidence/",
    ]) {
      expect(NO_STORE_PATHS.some((s) => s.startsWith(p))).toBe(true);
    }
  });

  it("never renders raw HTML (the CSP allows inline scripts, so this must hold)", () => {
    const offenders = ["app", "components", "lib"]
      .flatMap((d) => sourceFiles(path.join(root, d)))
      .filter((f) =>
        readFileSync(f, "utf8").includes("dangerouslySetInnerHTML"),
      )
      .map((f) => path.relative(root, f));
    expect(offenders).toEqual([]);
  });
});
