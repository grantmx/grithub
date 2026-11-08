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
  "/learn/assessment/s1",
  "/learn/attempt/a1",
  "/staff/marking/a1",
  "/staff/attempts/a1",
  "/staff/attempts/a1/pdf",
  "/staff/analytics",
  "/staff/questions/q1",
  "/staff/appeals",
  "/staff/assessment-days",
  "/staff/assessment-days/d1",
  "/staff/moderation/b1",
  "/admin/assessments",
  "/admin/assessments/coverage",
  "/learn/practical/s1",
  "/evidence/e1",
  "/api/evidence/upload",
  "/staff/marking/practical/x1",
  "/staff/submissions/x1",
  "/admin/practical",
  "/admin/practical/b1",
  "/account/profile",
  "/admin/people/u1/profile",
  "/api/qcto/areas",
] as const;
type Route = (typeof ROUTES)[number];

// Expected result per role (all with a passkey and setup complete).
const MATRIX: Record<string, Record<Route, "allow" | "forbidden">> = {
  learner: {
    "/learn/practical/s1": "allow",
    "/evidence/e1": "allow",
    "/api/evidence/upload": "allow",
    "/staff/marking/practical/x1": "forbidden",
    "/staff/submissions/x1": "forbidden",
    "/admin/practical": "forbidden",
    "/admin/practical/b1": "forbidden",
    "/account/profile": "allow",
    "/admin/people/u1/profile": "forbidden",
    "/api/qcto/areas": "allow",
    "/learn/assessment/s1": "allow",
    "/learn/attempt/a1": "allow",
    "/staff/marking/a1": "forbidden",
    "/staff/attempts/a1": "forbidden",
    "/staff/attempts/a1/pdf": "forbidden",
    "/staff/analytics": "forbidden",
    "/staff/questions/q1": "forbidden",
    "/staff/appeals": "forbidden",
    "/staff/assessment-days": "forbidden",
    "/staff/assessment-days/d1": "forbidden",
    "/staff/moderation/b1": "forbidden",
    "/admin/assessments": "forbidden",
    "/admin/assessments/coverage": "forbidden",
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
    "/learn/practical/s1": "allow",
    "/evidence/e1": "allow",
    "/api/evidence/upload": "allow",
    "/staff/marking/practical/x1": "forbidden",
    "/staff/submissions/x1": "forbidden",
    "/admin/practical": "forbidden",
    "/admin/practical/b1": "forbidden",
    "/account/profile": "allow",
    "/admin/people/u1/profile": "forbidden",
    "/api/qcto/areas": "allow",
    "/learn/assessment/s1": "allow",
    "/learn/attempt/a1": "allow",
    "/staff/marking/a1": "forbidden",
    "/staff/attempts/a1": "forbidden",
    "/staff/attempts/a1/pdf": "forbidden",
    "/staff/analytics": "forbidden",
    "/staff/questions/q1": "forbidden",
    "/staff/appeals": "forbidden",
    "/staff/assessment-days": "allow",
    "/staff/assessment-days/d1": "allow",
    "/staff/moderation/b1": "forbidden",
    "/admin/assessments": "forbidden",
    "/admin/assessments/coverage": "forbidden",
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
    "/learn/practical/s1": "allow",
    "/evidence/e1": "allow",
    "/api/evidence/upload": "allow",
    "/staff/marking/practical/x1": "allow",
    "/staff/submissions/x1": "allow",
    "/admin/practical": "forbidden",
    "/admin/practical/b1": "forbidden",
    "/account/profile": "allow",
    "/admin/people/u1/profile": "forbidden",
    "/api/qcto/areas": "allow",
    "/learn/assessment/s1": "allow",
    "/learn/attempt/a1": "allow",
    "/staff/marking/a1": "allow",
    "/staff/attempts/a1": "allow",
    "/staff/attempts/a1/pdf": "allow",
    "/staff/analytics": "allow",
    "/staff/questions/q1": "allow",
    "/staff/appeals": "forbidden",
    "/staff/assessment-days": "allow",
    "/staff/assessment-days/d1": "allow",
    "/staff/moderation/b1": "forbidden",
    "/admin/assessments": "forbidden",
    "/admin/assessments/coverage": "forbidden",
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
    "/learn/practical/s1": "allow",
    "/evidence/e1": "allow",
    "/api/evidence/upload": "allow",
    "/staff/marking/practical/x1": "forbidden",
    "/staff/submissions/x1": "allow",
    "/admin/practical": "forbidden",
    "/admin/practical/b1": "forbidden",
    "/account/profile": "allow",
    "/admin/people/u1/profile": "forbidden",
    "/api/qcto/areas": "allow",
    "/learn/assessment/s1": "allow",
    "/learn/attempt/a1": "allow",
    "/staff/marking/a1": "forbidden",
    "/staff/attempts/a1": "allow",
    "/staff/attempts/a1/pdf": "allow",
    "/staff/analytics": "allow",
    "/staff/questions/q1": "allow",
    "/staff/appeals": "allow",
    "/staff/assessment-days": "forbidden",
    "/staff/assessment-days/d1": "forbidden",
    "/staff/moderation/b1": "allow",
    "/admin/assessments": "forbidden",
    "/admin/assessments/coverage": "forbidden",
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
    "/learn/practical/s1": "allow",
    "/evidence/e1": "allow",
    "/api/evidence/upload": "allow",
    "/staff/marking/practical/x1": "forbidden",
    "/staff/submissions/x1": "forbidden",
    "/admin/practical": "allow",
    "/admin/practical/b1": "allow",
    "/account/profile": "allow",
    "/admin/people/u1/profile": "allow",
    "/api/qcto/areas": "allow",
    "/learn/assessment/s1": "allow",
    "/learn/attempt/a1": "allow",
    "/staff/marking/a1": "forbidden",
    "/staff/attempts/a1": "forbidden",
    "/staff/attempts/a1/pdf": "forbidden",
    "/staff/analytics": "forbidden",
    "/staff/questions/q1": "forbidden",
    "/staff/appeals": "forbidden",
    "/staff/assessment-days": "allow",
    "/staff/assessment-days/d1": "allow",
    "/staff/moderation/b1": "forbidden",
    "/admin/assessments": "allow",
    "/admin/assessments/coverage": "allow",
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
    "/learn/practical/s1": "allow",
    "/evidence/e1": "allow",
    "/api/evidence/upload": "allow",
    "/staff/marking/practical/x1": "forbidden",
    "/staff/submissions/x1": "allow",
    "/admin/practical": "forbidden",
    "/admin/practical/b1": "forbidden",
    "/account/profile": "allow",
    "/admin/people/u1/profile": "forbidden",
    "/api/qcto/areas": "allow",
    "/learn/assessment/s1": "allow",
    "/learn/attempt/a1": "allow",
    "/staff/marking/a1": "forbidden",
    "/staff/attempts/a1": "allow",
    "/staff/attempts/a1/pdf": "allow",
    "/staff/analytics": "forbidden",
    "/staff/questions/q1": "forbidden",
    "/staff/appeals": "forbidden",
    "/staff/assessment-days": "forbidden",
    "/staff/assessment-days/d1": "forbidden",
    "/staff/moderation/b1": "forbidden",
    "/admin/assessments": "forbidden",
    "/admin/assessments/coverage": "forbidden",
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
    // The profile step's Stats SA area search runs during setup.
    expect(decide(requirementFor("/api/qcto/areas"), pending).result).toBe(
      "allow",
    );
    expect(decide(requirementFor("/account/profile"), pending).result).toBe(
      "setup",
    );
  });
});

describe("step-up: marking, moderation and admin need a passkey", () => {
  it.each([
    ["assessor", "/staff/marking"],
    ["moderator", "/staff/moderation"],
    ["sdp_admin", "/admin"],
    ["sdp_admin", "/admin/people"],
    ["assessor", "/staff/attempts/a1"],
    ["moderator", "/staff/appeals"],
    ["assessor", "/staff/analytics"],
    ["sdp_admin", "/admin/assessments"],
    ["moderator", "/staff/submissions/x1"],
    ["assessor", "/staff/marking/practical/x1"],
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

  it("lets an external evaluator open a paper replay without a passkey", () => {
    expect(
      decide(
        requirementFor("/staff/attempts/a1"),
        ctx(["external_evaluator"], { activePasskeys: 0 }),
      ).result,
    ).toBe("allow");
  });

  it("does not ask facilitators for a passkey on the assessment-day register", () => {
    expect(
      decide(
        requirementFor("/staff/assessment-days/d1"),
        ctx(["facilitator"], { activePasskeys: 0 }),
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
