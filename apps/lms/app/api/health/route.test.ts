import { describe, expect, it } from "vitest";
import { GET, type HealthResponse } from "./route";

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const res = GET();
    expect(res.status).toBe(200);

    const body = (await res.json()) as HealthResponse;
    expect(body.status).toBe("ok");
    expect(body.service).toBe("lms");
    expect(Number.isNaN(Date.parse(body.time))).toBe(false);
  });

  it("is never cached", () => {
    expect(GET().headers.get("Cache-Control")).toBe("no-store");
  });

  it("exposes only the documented fields", async () => {
    const body = (await GET().json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["service", "status", "time"]);
  });
});
