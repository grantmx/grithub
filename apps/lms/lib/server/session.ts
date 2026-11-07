import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { passkeyCredentials, roleGrants, sessions, users } from "db";
import type { AccessContext, StaffRole } from "@/lib/access";
import { CURRENT_NOTICE } from "@/lib/popia";
import type { ServerCtx } from "./context";
import { randomToken, sha256Hex } from "./crypto";

export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type SessionMethod =
  | "passkey"
  | "magic_link"
  | "invitation"
  | "recovery";

export function sessionCookieName(secure: boolean): string {
  // __Host- requires Secure; plain name for http://localhost development.
  return secure ? "__Host-lms_session" : "lms_session";
}

export async function createSession(
  ctx: Pick<ServerCtx, "db" | "ipHash" | "now">,
  userId: string,
  method: SessionMethod,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken();
  const now = ctx.now();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await ctx.db.insert(sessions).values({
    tokenHash: sha256Hex(token),
    userId,
    authMethod: method,
    createdAt: now,
    expiresAt,
    lastSeenAt: now,
    ipHash: ctx.ipHash,
  });
  return { token, expiresAt };
}

/**
 * Resolve a session cookie into everything the access rules need.
 * Returns null for unknown, expired or revoked sessions.
 */
export async function loadAccessContext(
  ctx: Pick<ServerCtx, "db" | "now">,
  token: string | undefined | null,
): Promise<AccessContext | null> {
  if (!token) return null;
  const now = ctx.now();
  const [row] = await ctx.db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      status: users.status,
      noticeVersion: users.popiaNoticeVersion,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, sha256Hex(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now),
      ),
    )
    .limit(1);
  if (!row) return null;

  const grants = await ctx.db
    .select({ role: roleGrants.role })
    .from(roleGrants)
    .where(
      and(
        eq(roleGrants.userId, row.userId),
        or(isNull(roleGrants.expiresAt), gt(roleGrants.expiresAt, now)),
      ),
    );
  const [pk] = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(passkeyCredentials)
    .where(
      and(
        eq(passkeyCredentials.userId, row.userId),
        isNull(passkeyCredentials.revokedAt),
      ),
    );

  return {
    userId: row.userId,
    sessionId: row.sessionId,
    status: row.status,
    setupComplete:
      row.status === "active" && row.noticeVersion === CURRENT_NOTICE.version,
    roles: new Set(grants.map((g) => g.role as StaffRole)),
    activePasskeys: pk?.n ?? 0,
  };
}

export async function revokeSession(
  ctx: Pick<ServerCtx, "db" | "now">,
  sessionId: string,
): Promise<void> {
  await ctx.db
    .update(sessions)
    .set({ revokedAt: ctx.now() })
    .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
}

export async function revokeAllSessions(
  ctx: Pick<ServerCtx, "db" | "now">,
  userId: string,
): Promise<void> {
  await ctx.db
    .update(sessions)
    .set({ revokedAt: ctx.now() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}
