import { describe, expect, it } from "vitest";
import {
  type AccessContext,
  type StaffRole,
  decide,
  requirementFor,
  safeNext,
} from "@/lib/access";

const ctx = (
  roles: StaffRole[],
  extra: Partial<AccessContext> = {},
): AccessContext => ({
  userId: "u",
  sessionId: "s",
  status: "active",
  setupComplete: true,
  roles: new Set(roles),
  activePasskeys: 1,
  ...extra,
});

const ROUTES = [
  "/",
  "/learn",
  "/staff",
  "/staff/marking",
  "/staff/moderation",
  "/staff/evidence",
  "/admin",
  "/admin/people",
  "/library",
  "/more",
  "/learn/section/abc",
  "/staff/progress",
] as const;
type Route = (typeof ROUTES)[number];

// Expected result per role (all with a passkey and setup complete).
const MATRIX: Record<string, Record<Route, "allow" | "forbidden">> = {
  learner: {
    "/library": "allow",
    "/more": "allow",
    "/learn/section/abc": "allow",
    "/staff/progress": "forbidden",
    "/": "allow",
    "/learn": "allow",
    "/staff": "forbidden",
    "/staff/marking": "forbidden",
    "/staff/moderation": "forbidden",
    "/staff/evidence": "forbidden",
    "/admin": "forbidden",
    "/admin/people": "forbidden",
  },
  facilitator: {
    "/library": "allow",
    "/more": "allow",
    "/learn/section/abc": "allow",
    "/staff/progress": "allow",
    "/": "allow",
    "/learn": "allow",
    "/staff": "allow",
    "/staff/marking": "forbidden",
    "/staff/moderation": "forbidden",
    "/staff/evidence": "forbidden",
    "/admin": "forbidden",
    "/admin/people": "forbidden",
  },
  assessor: {
    "/library": "allow",
    "/more": "allow",
    "/learn/section/abc": "allow",
    "/staff/progress": "forbidden",
    "/": "allow",
    "/learn": "allow",
    "/staff": "allow",
    "/staff/marking": "allow",
    "/staff/moderation": "forbidden",
    "/staff/evidence": "forbidden",
    "/admin": "forbidden",
    "/admin/people": "forbidden",
  },
  moderator: {
    "/library": "allow",
    "/more": "allow",
    "/learn/section/abc": "allow",
    "/staff/progress": "forbidden",
    "/": "allow",
    "/learn": "allow",
    "/staff": "allow",
    "/staff/marking": "forbidden",
    "/staff/moderation": "allow",
    "/staff/evidence": "forbidden",
    "/admin": "forbidden",
    "/admin/people": "forbidden",
  },
  sdp_admin: {
    "/library": "allow",
    "/more": "allow",
    "/learn/section/abc": "allow",
    "/staff/progress": "allow",
    "/": "allow",
    "/learn": "allow",
    "/staff": "allow",
    "/staff/marking": "forbidden",
    "/staff/moderation": "forbidden",
    "/staff/evidence": "allow",
    "/admin": "allow",
    "/admin/people": "allow",
  },
  external_evaluator: {
    "/library": "allow",
    "/more": "allow",
    "/learn/section/abc": "allow",
    "/staff/progress": "forbidden",
    "/": "allow",
    "/learn": "allow",
    "/staff": "forbidden",
    "/staff/marking": "forbidden",
    "/staff/moderation": "forbidden",
    "/staff/evidence": "allow",
    "/admin": "forbidden",
    "/admin/people": "forbidden",
  },
};

describe("route access per role", () => {
  for (const [role, expected] of Object.entries(MATRIX)) {
    for (const route of ROUTES) {
      it(`${role} → ${route}: ${expected[route]}`, () => {
        const roles = role === "learner" ? [] : [role as StaffRole];
        expect(decide(requirementFor(route), ctx(roles)).result).toBe(
          expected[route],
        );
      });
    }
  }

  it("public routes need no session", () => {
    for (const p of [
      "/signin",
      "/signin/check-email",
      "/signin/help",
      "/auth/link/abc",
      "/setup/abc",
      "/api/health",
      "/forbidden",
    ]) {
      expect(decide(requirementFor(p), null).result).toBe("allow");
    }
  });

  it("protected routes send anonymous visitors to sign in", () => {
    for (const p of ROUTES)
      expect(decide(requirementFor(p), null).result).toBe("signin");
  });

  it("deactivated users are treated as signed out", () => {
    expect(
      decide(requirementFor("/"), ctx([], { status: "suspended" })).result,
    ).toBe("signin");
  });

  it("users who have not finished setup go to /setup (except /setup itself)", () => {
    const pending = ctx(["sdp_admin"], {
      setupComplete: false,
      status: "invited",
    });
    expect(decide(requirementFor("/admin"), pending).result).toBe("setup");
    expect(decide(requirementFor("/"), pending).result).toBe("setup");
    expect(decide(requirementFor("/setup"), pending).result).toBe("allow");
  });
});

describe("step-up: marking, moderation and admin need a passkey", () => {
  it.each([
    ["assessor", "/staff/marking"],
    ["moderator", "/staff/moderation"],
    ["sdp_admin", "/admin"],
    ["sdp_admin", "/admin/people"],
  ] as const)("%s without a passkey → stepup on %s", (role, route) => {
    expect(
      decide(requirementFor(route), ctx([role], { activePasskeys: 0 })),
    ).toEqual({
      result: "stepup",
      reason: "passkey_required",
    });
  });

  it("does not apply to facilitator or evaluator screens", () => {
    expect(
      decide(
        requirementFor("/staff"),
        ctx(["facilitator"], { activePasskeys: 0 }),
      ).result,
    ).toBe("allow");
    expect(
      decide(
        requirementFor("/staff/evidence"),
        ctx(["external_evaluator"], { activePasskeys: 0 }),
      ).result,
    ).toBe("allow");
  });

  it("checks the role before the passkey (no step-up prompt for the wrong role)", () => {
    expect(
      decide(
        requirementFor("/admin"),
        ctx(["facilitator"], { activePasskeys: 0 }),
      ).result,
    ).toBe("forbidden");
  });
});

describe("safeNext", () => {
  it("only allows same-site relative paths", () => {
    expect(safeNext("/admin/people")).toBe("/admin/people");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext(undefined)).toBe("/");
  });
});
