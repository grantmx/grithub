import { sql } from "drizzle-orm";
import type { ServerCtx } from "./context";
import { hmacHex } from "./crypto";
import { writeAudit } from "./audit";

export type RateLimitRule = {
  scope: string;
  limit: number;
  windowSeconds: number;
};

/** Limits for every auth entry point (per client IP unless noted). */
export const RATE_LIMITS = {
  passkeyOptions: { scope: "passkey-options", limit: 30, windowSeconds: 300 },
  passkeySignIn: { scope: "passkey-signin", limit: 20, windowSeconds: 300 },
  passkeyRegister: { scope: "passkey-register", limit: 10, windowSeconds: 900 },
  magicLinkPerIp: { scope: "magic-link-ip", limit: 20, windowSeconds: 900 },
  magicLinkPerEmail: {
    scope: "magic-link-email",
    limit: 5,
    windowSeconds: 900,
  },
  tokenConsume: { scope: "token-consume", limit: 20, windowSeconds: 900 },
  setup: { scope: "setup", limit: 30, windowSeconds: 900 },
  mediaPlayback: { scope: "media-playback", limit: 120, windowSeconds: 3600 },
  scrollSave: { scope: "scroll-save", limit: 600, windowSeconds: 3600 },
  // Assessments (per user). Autosave fires on every change, so it is generous.
  attemptBegin: { scope: "attempt-begin", limit: 20, windowSeconds: 900 },
  answerSave: { scope: "answer-save", limit: 900, windowSeconds: 3600 },
  attemptSubmit: { scope: "attempt-submit", limit: 10, windowSeconds: 900 },
  appealSubmit: { scope: "appeal-submit", limit: 5, windowSeconds: 86400 },
  paperExport: { scope: "paper-export", limit: 120, windowSeconds: 3600 },
} satisfies Record<string, RateLimitRule>;

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Too many attempts. Please wait and try again.");
    this.name = "RateLimitError";
  }
}

/**
 * Fixed-window counter in Postgres, so the limit holds across serverless
 * instances. `subject` (IP hash, email, user id) is HMAC'd before storage.
 */
export async function hitRateLimit(
  ctx: Pick<ServerCtx, "db" | "config" | "ipHash">,
  rule: RateLimitRule,
  subject: string | null,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const key = `${rule.scope}:${hmacHex(ctx.config.sessionSecret, subject ?? "unknown")}`;
  const rows = await ctx.db.execute<{
    count: number;
    window_start: Date | string;
  }>(sql`
    INSERT INTO rate_limit_buckets AS b (key, window_start, count)
    VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN b.window_start < now() - make_interval(secs => ${rule.windowSeconds})
                   THEN 1 ELSE b.count + 1 END,
      window_start = CASE WHEN b.window_start < now() - make_interval(secs => ${rule.windowSeconds})
                   THEN now() ELSE b.window_start END
    RETURNING count, window_start
  `);
  const row = rows[0];
  const count = Number(row?.count ?? 1);
  const windowStart = row ? new Date(row.window_start) : new Date();
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil(
      (windowStart.getTime() + rule.windowSeconds * 1000 - Date.now()) / 1000,
    ),
  );
  return { allowed: count <= rule.limit, retryAfterSeconds };
}

/** Throw RateLimitError (and audit it) when the limit is exceeded. */
export async function enforceRateLimit(
  ctx: Pick<ServerCtx, "db" | "config" | "ipHash">,
  rule: RateLimitRule,
  subject: string | null,
): Promise<void> {
  const result = await hitRateLimit(ctx, rule, subject);
  if (!result.allowed) {
    await writeAudit(ctx, {
      action: "auth.rate_limited",
      entityType: "rate_limit",
      after: { scope: rule.scope },
    });
    throw new RateLimitError(result.retryAfterSeconds);
  }
}
