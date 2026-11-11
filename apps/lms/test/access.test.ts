import { describe, expect, it } from "vitest";
import {
  type AccessContext,
  type StaffRole,
  afterLinkSignIn,
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
  "/staff/moderation/b1/item/a1",
  "/staff/moderation/b1/report/pdf",
  "/staff/moderation-feedback",
  "/staff/materials",
  "/staff/materials/banks/k1",
] as const;
type Route = (typeof ROUTES)[number];

// Expected result per role (all with a passkey and setup complete).
const MATRIX: Record<string, Record<Route, "allow" | "forbidden">> = {
  learner: {
    "/staff/moderation/b1/item/a1": "forbidden",
    "/staff/moderation/b1/report/pdf": "forbidden",
    "/staff/moderation-feedback": "forbidden",
    "/staff/materials": "forbidden",
    "/staff/materials/banks/k1": "forbidden",
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
    "/staff/moderation/b1/item/a1": "forbidden",
    "/staff/moderation/b1/report/pdf": "forbidden",
    "/staff/moderation-feedback": "forbidden",
    "/staff/materials": "forbidden",
    "/staff/materials/banks/k1": "forbidden",
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
    "/staff/moderation/b1/item/a1": "forbidden",
    "/staff/moderation/b1/report/pdf": "forbidden",
    "/staff/moderation-feedback": "allow",
    "/staff/materials": "forbidden",
    "/staff/materials/banks/k1": "forbidden",
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
    "/staff/moderation/b1/item/a1": "allow",
    "/staff/moderation/b1/report/pdf": "allow",
    "/staff/moderation-feedback": "forbidden",
    "/staff/materials": "allow",
    "/staff/materials/banks/k1": "allow",
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
    "/staff/questions/q1": "forbidden",
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
    "/staff/moderation/b1/item/a1": "forbidden",
    "/staff/moderation/b1/report/pdf": "forbidden",
    "/staff/moderation-feedback": "forbidden",
    "/staff/materials": "forbidden",
    "/staff/materials/banks/k1": "forbidden",
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
    "/staff/moderation/b1/item/a1": "forbidden",
    "/staff/moderation/b1/report/pdf": "forbidden",
    "/staff/moderation-feedback": "forbidden",
    "/staff/materials": "forbidden",
    "/staff/materials/banks/k1": "forbidden",
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
    ["moderator", "/staff/moderation/b1/item/a1"],
    ["moderator", "/staff/materials"],
    ["assessor", "/staff/moderation-feedback"],
    ["assessor", "/staff/questions/q1"],
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

// Communication and support routes (design.md §14, 2026-11-08). One row per
// route: the expected result for each role, in this order.
const COMMS_ROLES = ["learner", "facilitator", "assessor", "moderator", "sdp_admin", "external_evaluator"] as const;
const A = "allow" as const;
const F = "forbidden" as const;
const COMMS_MATRIX: [route: string, expected: readonly ("allow" | "forbidden")[]][] = [
  //                                         learner fac assr  mod  admin eval
  ["/messages", [A, A, A, A, A, A]],
  ["/messages/announcements", [A, A, A, A, A, A]],
  ["/messages/announcements/a1", [A, A, A, A, A, A]],
  ["/messages/new", [A, A, A, A, A, A]],
  ["/messages/c/c1", [A, A, A, A, A, A]],
  ["/messages/help/new", [A, A, A, A, A, A]],
  ["/messages/help/t1", [A, A, A, A, A, A]],
  ["/notifications", [A, A, A, A, A, A]],
  ["/notifications/n1", [A, A, A, A, A, A]],
  ["/learn/discuss/m1", [A, A, A, A, A, A]],
  ["/learn/discuss/thread/t1", [A, A, A, A, A, A]],
  ["/sessions/s1", [A, A, A, A, A, A]],
  ["/sessions/s1/ics", [A, A, A, A, A, A]],
  ["/account/notifications", [A, A, A, A, A, A]],
  ["/staff/announcements", [F, A, F, F, A, F]],
  ["/staff/discussions", [F, A, F, F, A, F]],
  ["/staff/discussions/board", [F, A, F, F, A, F]],
  ["/staff/discussions/thread/t1", [F, A, F, F, A, F]],
  ["/staff/messages", [F, A, A, F, F, F]],
  ["/staff/messages/new", [F, A, A, F, F, F]],
  ["/staff/messages/c1", [F, A, A, F, F, F]],
  ["/staff/tickets", [F, A, F, F, A, F]],
  ["/staff/tickets/t1", [F, A, F, F, A, F]],
  ["/staff/reports", [F, A, F, F, A, F]],
  ["/staff/sessions", [F, A, F, F, A, F]],
  ["/staff/sessions/s1", [F, A, F, F, A, F]],
  ["/staff/section-notes", [F, A, F, F, A, F]],
  ["/staff/evidence/communication", [F, F, F, F, A, A]],
  ["/staff/evidence/communication/csv", [F, F, F, F, A, A]],
  ["/staff/evidence/communication/pdf", [F, F, F, F, A, A]],
];

describe("communication and support routes per role", () => {
  for (const [route, expected] of COMMS_MATRIX) {
    COMMS_ROLES.forEach((role, i) => {
      it(`${role} → ${route}: ${expected[i]}`, () => {
        const roles = role === "learner" ? [] : [role as StaffRole];
        expect(decide(requirementFor(route), ctx(roles)).result).toBe(expected[i]);
      });
    });
    it(`anonymous → ${route}: signin`, () => {
      expect(decide(requirementFor(route), null).result).toBe("signin");
    });
  }

  it("after an emailed link: recovery, setup, add a passkey, or confirm it", () => {
    const done = { setupComplete: true, activePasskeys: 0 };
    expect(afterLinkSignIn("recovery", null)).toBe("/account/passkeys?prompt=recovery");
    expect(afterLinkSignIn("magic_link", null)).toBe("/setup");
    expect(afterLinkSignIn("magic_link", { ...done, setupComplete: false })).toBe("/setup");
    expect(afterLinkSignIn("magic_link", done)).toBe("/account/passkeys?prompt=1");
    expect(afterLinkSignIn("magic_link", { ...done, activePasskeys: 2 })).toBe("/auth/confirm");
  });

  it("/auth/confirm (passkey after magic link): any signed-in user, anonymous → signin", () => {
    for (const role of COMMS_ROLES) {
      const roles = role === "learner" ? [] : [role as StaffRole];
      expect(decide(requirementFor("/auth/confirm"), ctx(roles)).result).toBe("allow");
    }
    expect(decide(requirementFor("/auth/confirm"), null).result).toBe("signin");
  });

  it("cron endpoints are reachable without a session (the handler checks CRON_SECRET)", () => {
    expect(decide(requirementFor("/api/cron/weekly-digest"), null).result).toBe("allow");
    expect(decide(requirementFor("/api/cron/overdue-tickets"), null).result).toBe("allow");
    expect(decide(requirementFor("/api/cron/anything-else"), null).result).toBe("signin");
  });
});

// Form 5 readiness and QCTO panel (design.md §14, 2026-11-09).
const FORM5_MATRIX: [route: string, expected: readonly ("allow" | "forbidden")[]][] = [
  //                                          learner fac assr  mod  admin eval
  ["/admin/form5", [F, F, F, F, A, F]],
  ["/admin/qcto", [F, F, F, F, A, F]],
  ["/api/compliance/guide-upload", [F, F, F, F, A, F]],
  ["/staff/evidence/form5", [F, F, F, F, A, A]],
  ["/staff/evidence/form5/pack", [F, F, F, F, A, A]],
  ["/staff/evidence/form5/guide/q1", [F, F, F, F, A, A]],
];

describe("Form 5 readiness and QCTO panel routes per role", () => {
  for (const [route, expected] of FORM5_MATRIX) {
    COMMS_ROLES.forEach((role, i) => {
      it(`${role} → ${route}: ${expected[i]}`, () => {
        const roles = role === "learner" ? [] : [role as StaffRole];
        expect(decide(requirementFor(route), ctx(roles)).result).toBe(expected[i]);
      });
    });
  }
  it("admin Form 5 screens need a passkey (step-up)", () => {
    expect(decide(requirementFor("/admin/form5"), ctx(["sdp_admin"], { activePasskeys: 0 })).result).toBe("stepup");
    expect(decide(requirementFor("/api/compliance/guide-upload"), ctx(["sdp_admin"], { activePasskeys: 0 })).result).toBe("stepup");
  });
  it("the nightly backup cron endpoint is reachable without a session (CRON_SECRET checked in the handler)", () => {
    expect(decide(requirementFor("/api/cron/nightly-backup"), null).result).toBe("allow");
  });
});
