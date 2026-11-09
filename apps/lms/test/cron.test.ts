import { describe, expect, it } from "vitest";
import { cronAuthorized } from "@/lib/server/cron";

const req = (auth?: string) => new Request("https://lms.test.invalid/api/cron/weekly-digest", { headers: auth ? { authorization: auth } : {} });
const SECRET = "test-only-cron-secret-0123456789";

describe("cron authentication", () => {
  it("accepts only the exact bearer secret", () => {
    expect(cronAuthorized(req(`Bearer ${SECRET}`), SECRET)).toBe(true);
    expect(cronAuthorized(req(`Bearer ${SECRET}x`), SECRET)).toBe(false);
    expect(cronAuthorized(req(SECRET), SECRET)).toBe(false);
    expect(cronAuthorized(req(), SECRET)).toBe(false);
  });

  it("refuses every call when no (or a too-short) secret is configured", () => {
    expect(cronAuthorized(req("Bearer "), undefined)).toBe(false);
    expect(cronAuthorized(req("Bearer short"), "short")).toBe(false);
  });
});
