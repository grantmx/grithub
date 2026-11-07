import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  type Database,
  auditLog,
  cohorts,
  enrolments,
  passkeyCredentials,
  qualifications,
  roleGrants,
  users,
} from "db";
import type { StaffRole } from "@/lib/access";
import { CURRENT_NOTICE } from "@/lib/popia";
import type { ServerCtx } from "@/lib/server/context";
import { readAuthConfig } from "@/lib/server/env";
import { createSession, loadAccessContext } from "@/lib/server/session";
import { SoftAuthenticator } from "./authenticator";

export { createTestDb, type TestDb } from "db/testing";

/** A fresh context with a unique (fake) IP hash so rate limits don't collide. */
export function makeCtx(
  db: Database,
  overrides: Partial<ServerCtx> = {},
): ServerCtx {
  return {
    db,
    config: readAuthConfig(),
    ipHash: `test-ip-${randomBytes(6).toString("hex")}`,
    now: () => new Date(),
    ...overrides,
  };
}

const uniq = () => randomBytes(5).toString("hex");

export async function makeCohort(db: Database) {
  const [q] = await db
    .insert(qualifications)
    .values({
      curriculumCode: `TEST-${uniq()}`,
      title: "Test qualification (fake)",
      nqfLevel: 4,
    })
    .returning();
  const [c] = await db
    .insert(cohorts)
    .values({
      qualificationId: q!.id,
      name: `Test cohort ${uniq()}`,
      startsOn: "2030-01-01",
      endsOn: "2030-06-30",
    })
    .returning();
  return c!;
}

/** Create a user. setupComplete=true means active + current notice accepted. */
export async function makeUser(
  db: Database,
  opts: {
    roles?: StaffRole[];
    setupComplete?: boolean;
    status?: "invited" | "active" | "suspended";
    passkeys?: number;
    cohortId?: string;
    roleExpiresAt?: Date;
  } = {},
) {
  const setupComplete = opts.setupComplete ?? true;
  const [user] = await db
    .insert(users)
    .values({
      displayName: `Test User ${uniq()} (fake)`,
      email: `test.${uniq()}@example.invalid`,
      status: opts.status ?? (setupComplete ? "active" : "invited"),
      popiaNoticeAcceptedAt: setupComplete ? new Date() : null,
      popiaNoticeVersion: setupComplete ? CURRENT_NOTICE.version : null,
    })
    .returning();
  for (const role of opts.roles ?? []) {
    const global = role === "sdp_admin" || role === "external_evaluator";
    await db.insert(roleGrants).values({
      userId: user!.id,
      role,
      cohortId: global ? null : (opts.cohortId ?? null),
      expiresAt:
        role === "external_evaluator"
          ? (opts.roleExpiresAt ?? new Date(Date.now() + 86_400_000))
          : (opts.roleExpiresAt ?? null),
    });
  }
  for (let i = 0; i < (opts.passkeys ?? 0); i++) {
    await db.insert(passkeyCredentials).values({
      userId: user!.id,
      credentialId: randomBytes(16).toString("base64url"),
      publicKey: new Uint8Array(randomBytes(65)),
      deviceLabel: `Fake device ${i + 1}`,
    });
  }
  if (opts.cohortId) {
    await db
      .insert(enrolments)
      .values({ userId: user!.id, cohortId: opts.cohortId })
      .onConflictDoNothing();
  }
  return user!;
}

/** Sign a user in and return the access context the proxy/actions would see. */
export async function actorFor(ctx: ServerCtx, userId: string) {
  const { token } = await createSession(ctx, userId, "passkey");
  const actor = await loadAccessContext(ctx, token);
  if (!actor) throw new Error("expected a session");
  return { token, actor };
}

export async function auditActions(db: Database, actorId?: string) {
  const rows = actorId
    ? await db.select().from(auditLog).where(eq(auditLog.actorId, actorId))
    : await db.select().from(auditLog);
  return rows.map((r) => r.action);
}

export function newAuthenticator() {
  const config = readAuthConfig();
  return new SoftAuthenticator(config.rpId, config.origin);
}
