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
  /** Current POPIA notice accepted (and therefore first-time setup done). */
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
];

export function requirementFor(pathname: string): Requirement {
  if (PUBLIC_PATHS.some((re) => re.test(pathname))) return { kind: "public" };
  if (pathname === "/setup") return { kind: "user", allowDuringSetup: true };

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return { kind: "roles", anyOf: ["sdp_admin"], stepUp: true };
  }
  if (pathname === "/staff/marking" || pathname.startsWith("/staff/marking/")) {
    return { kind: "roles", anyOf: ["assessor"], stepUp: true };
  }
  if (
    pathname === "/staff/moderation" ||
    pathname.startsWith("/staff/moderation/")
  ) {
    return { kind: "roles", anyOf: ["moderator"], stepUp: true };
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
    if (requirement.stepUp && ctx.activePasskeys < 1) {
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
