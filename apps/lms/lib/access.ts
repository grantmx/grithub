/**
 * Route access rules — pure functions shared by the proxy (proxy.ts) and the
 * server-action guards, so both enforce exactly the same policy.
 * Source: docs/lms/roles.md.
 */

export type StaffRole =
  | "facilitator"
  | "assessor"
  | "moderator"
  | "sdp_admin"
  | "external_evaluator";

/** Roles that must have at least one active passkey to reach their screens. */
export const STEP_UP_ROLES: readonly StaffRole[] = [
  "assessor",
  "moderator",
  "sdp_admin",
];

export type AccessContext = {
  userId: string;
  sessionId: string;
  status: "invited" | "active" | "suspended";
  /**
   * First-time setup done: current POPIA notice accepted and, for learners,
   * current QCTO sharing consent and a confirmed QCTO profile (setupState.ts).
   */
  setupComplete: boolean;
  roles: ReadonlySet<StaffRole>;
  activePasskeys: number;
};

export type Requirement =
  | { kind: "public" }
  | { kind: "user"; allowDuringSetup?: boolean }
  | { kind: "roles"; anyOf: readonly StaffRole[]; stepUp: boolean };

export type Decision =
  | { result: "allow" }
  | { result: "signin" }
  | { result: "setup" }
  | { result: "forbidden"; reason: "missing_role" }
  | { result: "stepup"; reason: "passkey_required" };

const PUBLIC_PATHS: RegExp[] = [
  /^\/signin(\/.*)?$/,
  /^\/auth\/link\/[^/]+$/,
  /^\/setup\/[^/]+$/, // invitation landing (token in path)
  /^\/forbidden$/,
  /^\/api\/health$/,
  // Vercel Cron: authenticated by CRON_SECRET inside each handler.
  /^\/api\/cron\/(weekly-digest|overdue-tickets|nightly-backup)$/,
];

export function requirementFor(pathname: string): Requirement {
  if (PUBLIC_PATHS.some((re) => re.test(pathname))) return { kind: "public" };
  if (pathname === "/setup") return { kind: "user", allowDuringSetup: true };
  // Stats SA area type-ahead: used by the profile step during setup.
  if (pathname === "/api/qcto/areas")
    return { kind: "user", allowDuringSetup: true };

  // Learner guide direct upload token (Form 5 dashboard, design.md §14, 2026-11-09).
  if (pathname === "/api/compliance/guide-upload") {
    return { kind: "roles", anyOf: ["sdp_admin"], stepUp: true };
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return { kind: "roles", anyOf: ["sdp_admin"], stepUp: true };
  }
  const under = (base: string) =>
    pathname === base || pathname.startsWith(`${base}/`);
  if (under("/staff/marking")) {
    return { kind: "roles", anyOf: ["assessor"], stepUp: true };
  }
  // Paper replay and PDF (answer keys), and practical evidence: never facilitators or admins.
  if (under("/staff/attempts") || under("/staff/submissions")) {
    return {
      kind: "roles",
      anyOf: ["assessor", "moderator", "external_evaluator"],
      stepUp: true,
    };
  }
  // Question analytics (answer keys): assessors and moderators (read-only).
  if (under("/staff/analytics")) {
    return { kind: "roles", anyOf: ["assessor", "moderator"], stepUp: true };
  }
  // Retiring and versioning questions: assessors only. Moderators never edit
  // question versions (design.md §14, 2026-11-08).
  if (under("/staff/questions")) {
    return { kind: "roles", anyOf: ["assessor"], stepUp: true };
  }
  // Moderation outcomes on my decisions; Actions done.
  if (under("/staff/moderation-feedback")) {
    return { kind: "roles", anyOf: ["assessor"], stepUp: true };
  }
  // Read-only question banks, formatives and section checks (Form 5 4.2.5).
  if (under("/staff/materials")) {
    return { kind: "roles", anyOf: ["moderator"], stepUp: true };
  }
  if (under("/staff/appeals")) {
    return { kind: "roles", anyOf: ["moderator"], stepUp: true };
  }
  // Assessment-day register: attendance and ID checks (opening papers needs an assessor).
  if (under("/staff/assessment-days")) {
    return {
      kind: "roles",
      anyOf: ["facilitator", "assessor", "sdp_admin"],
      stepUp: false,
    };
  }
  if (
    pathname === "/staff/moderation" ||
    pathname.startsWith("/staff/moderation/")
  ) {
    return { kind: "roles", anyOf: ["moderator"], stepUp: true };
  }
  // Communication and support (design.md §14, 2026-11-08): facilitators and
  // SDP admins. Direct messages: facilitators and assessors (their own
  // conversations only); SDP admins never read them outside the audited log export.
  if (
    under("/staff/announcements") ||
    under("/staff/discussions") ||
    under("/staff/tickets") ||
    under("/staff/reports") ||
    under("/staff/sessions") ||
    under("/staff/section-notes")
  ) {
    return { kind: "roles", anyOf: ["facilitator", "sdp_admin"], stepUp: false };
  }
  if (under("/staff/messages")) {
    return { kind: "roles", anyOf: ["facilitator", "assessor"], stepUp: false };
  }
  if (
    pathname === "/staff/progress" ||
    pathname.startsWith("/staff/progress/")
  ) {
    // Learner progress reports: facilitators (own cohorts) and SDP admins.
    return {
      kind: "roles",
      anyOf: ["facilitator", "sdp_admin"],
      stepUp: false,
    };
  }
  if (
    pathname === "/staff/evidence" ||
    pathname.startsWith("/staff/evidence/")
  ) {
    return {
      kind: "roles",
      anyOf: ["external_evaluator", "sdp_admin"],
      stepUp: false,
    };
  }
  if (pathname === "/staff" || pathname.startsWith("/staff/")) {
    return {
      kind: "roles",
      anyOf: ["facilitator", "assessor", "moderator", "sdp_admin"],
      stepUp: false,
    };
  }
  // Learner communication: Messages (announcements, conversations, help),
  // notifications, module discussions, live sessions and email preferences.
  // Signed-in users; each item is checked against the viewer in lib/server/*.
  if (
    under("/messages") ||
    under("/notifications") ||
    under("/learn/discuss") ||
    under("/sessions") ||
    pathname === "/account/notifications"
  ) {
    return { kind: "user" };
  }
  return { kind: "user" };
}

export function decide(
  requirement: Requirement,
  ctx: AccessContext | null,
): Decision {
  if (requirement.kind === "public") return { result: "allow" };
  if (!ctx || ctx.status === "suspended") return { result: "signin" };

  const allowDuringSetup =
    requirement.kind === "user" && requirement.allowDuringSetup;
  if (!ctx.setupComplete && !allowDuringSetup) return { result: "setup" };

  if (requirement.kind === "roles") {
    if (!requirement.anyOf.some((r) => ctx.roles.has(r))) {
      return { result: "forbidden", reason: "missing_role" };
    }
    // Step-up applies to the step-up roles that grant this route (an external
    // evaluator sharing a route with assessors is not asked for a passkey).
    const granting = requirement.anyOf.filter((r) => ctx.roles.has(r));
    if (
      requirement.stepUp &&
      ctx.activePasskeys < 1 &&
      granting.every((r) => STEP_UP_ROLES.includes(r))
    ) {
      return { result: "stepup", reason: "passkey_required" };
    }
  }
  return { result: "allow" };
}

/** True when the user holds a role whose screens require a passkey. */
export function needsPasskey(roles: ReadonlySet<StaffRole>): boolean {
  return STEP_UP_ROLES.some((r) => roles.has(r));
}

/** Only allow same-site relative redirects (prevents open redirects). */
export function safeNext(
  next: string | null | undefined,
  fallback = "/",
): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\")
  ) {
    return fallback;
  }
  return next;
}
