import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { authTokens, users } from "db";
import type { ServerCtx } from "./context";
import { randomToken, sha256Hex } from "./crypto";

export type TokenPurpose = "invitation" | "magic_link" | "recovery";

export const TOKEN_TTL_MS: Record<TokenPurpose, number> = {
  invitation: 72 * 60 * 60 * 1000,
  magic_link: 15 * 60 * 1000,
  recovery: 30 * 60 * 1000,
};

/**
 * Issue a single-use token. Only its SHA-256 is stored. Any earlier unused
 * token of the same purpose for the user is revoked, so only the newest
 * link works.
 */
export async function issueToken(
  ctx: Pick<ServerCtx, "db" | "now">,
  input: {
    userId: string;
    purpose: TokenPurpose;
    cohortId?: string;
    createdBy?: string;
  },
): Promise<string> {
  const now = ctx.now();
  await ctx.db
    .update(authTokens)
    .set({ revokedAt: now })
    .where(
      and(
        eq(authTokens.userId, input.userId),
        eq(authTokens.purpose, input.purpose),
        isNull(authTokens.usedAt),
        isNull(authTokens.revokedAt),
      ),
    );
  const token = randomToken();
  await ctx.db.insert(authTokens).values({
    tokenHash: sha256Hex(token),
    userId: input.userId,
    purpose: input.purpose,
    cohortId: input.cohortId ?? null,
    createdBy: input.createdBy ?? null,
    createdAt: now,
    expiresAt: new Date(now.getTime() + TOKEN_TTL_MS[input.purpose]),
  });
  return token;
}

export type ConsumeResult =
  | { ok: true; userId: string; purpose: TokenPurpose; tokenId: string }
  | {
      ok: false;
      reason: "invalid" | "expired" | "used" | "revoked" | "deactivated";
    };

/**
 * Atomically mark a token used. Succeeds once; every later attempt fails.
 * Deactivated users can't use tokens.
 */
export async function consumeToken(
  ctx: Pick<ServerCtx, "db" | "now">,
  rawToken: string,
  purposes: readonly TokenPurpose[],
): Promise<ConsumeResult> {
  const hash = sha256Hex(rawToken);
  const now = ctx.now();
  const [used] = await ctx.db
    .update(authTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(authTokens.tokenHash, hash),
        inArray(authTokens.purpose, [...purposes]),
        isNull(authTokens.usedAt),
        isNull(authTokens.revokedAt),
        gt(authTokens.expiresAt, now),
      ),
    )
    .returning({
      id: authTokens.id,
      userId: authTokens.userId,
      purpose: authTokens.purpose,
    });

  if (used) {
    const [user] = await ctx.db
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, used.userId));
    if (!user || user.status === "suspended")
      return { ok: false, reason: "deactivated" };
    return {
      ok: true,
      userId: used.userId,
      purpose: used.purpose,
      tokenId: used.id,
    };
  }

  // Explain why (for a helpful message); never reveals who the token was for.
  const [row] = await ctx.db
    .select({
      usedAt: authTokens.usedAt,
      revokedAt: authTokens.revokedAt,
      expiresAt: authTokens.expiresAt,
      purpose: authTokens.purpose,
    })
    .from(authTokens)
    .where(eq(authTokens.tokenHash, hash));
  if (!row || !purposes.includes(row.purpose))
    return { ok: false, reason: "invalid" };
  if (row.usedAt) return { ok: false, reason: "used" };
  if (row.revokedAt) return { ok: false, reason: "revoked" };
  return { ok: false, reason: "expired" };
}
