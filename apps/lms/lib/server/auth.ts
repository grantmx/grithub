import { and, eq, gt, isNull, sql } from "drizzle-orm";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { passkeyCredentials, users, webauthnChallenges } from "db";
import {
  type AccessContext,
  type Decision,
  type Requirement,
  decide,
  needsPasskey,
} from "@/lib/access";
import type { ServerCtx } from "./context";
import { bytesToUuid, uuidToBytes } from "./crypto";
import { type AuditAction, writeAudit } from "./audit";
import { magicLinkEmail, sendEmail } from "./email";
import { RATE_LIMITS, enforceRateLimit } from "./ratelimit";
import { createSession, type SessionMethod } from "./session";
import { consumeToken, issueToken, type ConsumeResult } from "./tokens";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export class AuthError extends Error {
  constructor(
    public readonly code:
      | "not_signed_in"
      | "verification_failed"
      | "challenge_invalid"
      | "last_passkey"
      | "not_found",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export class AccessDeniedError extends Error {
  constructor(
    public readonly decision: Exclude<Decision, { result: "allow" }>,
  ) {
    super(`Access denied: ${decision.result}`);
    this.name = "AccessDeniedError";
  }
}

/**
 * Guard for server actions and server-side logic: the same rules as the
 * proxy (lib/access.ts), checked again at the point of the write.
 * Denials are audit-logged.
 */
export async function authorize(
  ctx: Pick<ServerCtx, "db" | "ipHash">,
  actor: AccessContext | null,
  requirement: Requirement,
  target: string,
): Promise<AccessContext> {
  const decision = decide(requirement, actor);
  if (decision.result === "allow" && actor) return actor;
  if (decision.result === "allow")
    throw new AccessDeniedError({ result: "signin" });
  await writeAudit(ctx, {
    action: "auth.permission_denied",
    actorId: actor?.userId ?? null,
    entityType: "action",
    after: { target, result: decision.result },
  });
  throw new AccessDeniedError(decision);
}

const normaliseEmail = (email: string) => email.trim().toLowerCase();

// ---------------------------------------------------------------------------
// Magic links
// ---------------------------------------------------------------------------

/**
 * Email a sign-in link if the address belongs to an invited or active user.
 * Always behaves the same for unknown addresses (no account enumeration).
 */
export async function requestMagicLink(
  ctx: ServerCtx,
  rawEmail: string,
): Promise<void> {
  const email = normaliseEmail(rawEmail);
  await enforceRateLimit(ctx, RATE_LIMITS.magicLinkPerIp, ctx.ipHash);
  await enforceRateLimit(ctx, RATE_LIMITS.magicLinkPerEmail, email);

  const [user] = await ctx.db
    .select({ id: users.id, status: users.status })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`);
  if (!user || user.status === "suspended") return;

  const token = await issueToken(ctx, {
    userId: user.id,
    purpose: "magic_link",
  });
  await sendEmail(
    magicLinkEmail(email, `${ctx.config.appUrl}/auth/link/${token}`),
  );
  await writeAudit(ctx, {
    action: "auth.magic_link.requested",
    actorId: user.id,
    entityType: "user",
    entityId: user.id,
  });
}

export type LinkSignInResult =
  | {
      ok: true;
      token: string;
      expiresAt: Date;
      userId: string;
      method: SessionMethod;
    }
  | { ok: false; reason: Extract<ConsumeResult, { ok: false }>["reason"] };

/**
 * Exchange an emailed link (magic link, recovery or invitation) for a
 * session. Called only from a POST (button press), never on GET, so email
 * link scanners can't use up the link.
 *
 * Using the token, creating the session and the sign-in audit row happen in
 * one transaction: if any of them fails, the link is left unused so the
 * person can simply press the button again.
 */
export async function signInWithLink(
  ctx: ServerCtx,
  rawToken: string,
  kind: "link" | "invitation",
): Promise<LinkSignInResult> {
  await enforceRateLimit(ctx, RATE_LIMITS.tokenConsume, ctx.ipHash);
  const purposes =
    kind === "invitation"
      ? (["invitation"] as const)
      : (["magic_link", "recovery"] as const);
  const outcome = await ctx.db.transaction(
    async (tx): Promise<LinkSignInResult> => {
      const txCtx = { ...ctx, db: tx };
      const result = await consumeToken(txCtx, rawToken, purposes);
      if (!result.ok) return result;
      const method: SessionMethod =
        result.purpose === "invitation"
          ? "invitation"
          : result.purpose === "recovery"
            ? "recovery"
            : "magic_link";
      const session = await createSession(txCtx, result.userId, method);
      await writeAudit(txCtx, {
        action:
          method === "invitation"
            ? "auth.signin.invitation"
            : method === "recovery"
              ? "auth.signin.recovery"
              : "auth.signin.magic_link",
        actorId: result.userId,
        entityType: "user",
        entityId: result.userId,
        after: { tokenId: result.tokenId },
      });
      return { ok: true, ...session, userId: result.userId, method };
    },
  );
  if (!outcome.ok) {
    await writeAudit(ctx, {
      action: "auth.link.rejected",
      entityType: "auth_token",
      after: { kind, reason: outcome.reason },
    });
  }
  return outcome;
}

// ---------------------------------------------------------------------------
// WebAuthn challenges
// ---------------------------------------------------------------------------

async function storeChallenge(
  ctx: Pick<ServerCtx, "db" | "now">,
  challenge: string,
  ceremony: "registration" | "authentication",
  userId: string | null,
): Promise<string> {
  const now = ctx.now();
  const [row] = await ctx.db
    .insert(webauthnChallenges)
    .values({
      challenge,
      ceremony,
      userId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + CHALLENGE_TTL_MS),
    })
    .returning({ id: webauthnChallenges.id });
  if (!row) throw new Error("Failed to store challenge");
  return row.id;
}

/** Use a challenge exactly once (atomic). */
async function takeChallenge(
  ctx: Pick<ServerCtx, "db" | "now">,
  challengeId: string | undefined,
  ceremony: "registration" | "authentication",
): Promise<{ challenge: string; userId: string | null }> {
  if (!challengeId)
    throw new AuthError("challenge_invalid", "Please try again.");
  const now = ctx.now();
  const [row] = await ctx.db
    .update(webauthnChallenges)
    .set({ usedAt: now })
    .where(
      and(
        eq(webauthnChallenges.id, challengeId),
        eq(webauthnChallenges.ceremony, ceremony),
        isNull(webauthnChallenges.usedAt),
        gt(webauthnChallenges.expiresAt, now),
      ),
    )
    .returning({
      challenge: webauthnChallenges.challenge,
      userId: webauthnChallenges.userId,
    });
  if (!row)
    throw new AuthError(
      "challenge_invalid",
      "That request expired. Please try again.",
    );
  return row;
}

// ---------------------------------------------------------------------------
// Passkey registration
// ---------------------------------------------------------------------------

export async function passkeyRegistrationOptions(
  ctx: ServerCtx,
  actor: AccessContext | null,
): Promise<{
  options: PublicKeyCredentialCreationOptionsJSON;
  challengeId: string;
}> {
  if (!actor || actor.status === "suspended") {
    throw new AuthError("not_signed_in", "Please sign in first.");
  }
  await enforceRateLimit(ctx, RATE_LIMITS.passkeyRegister, actor.userId);
  const [user] = await ctx.db
    .select({ email: users.email, displayName: users.displayName })
    .from(users)
    .where(eq(users.id, actor.userId));
  if (!user) throw new AuthError("not_signed_in", "Please sign in first.");

  const existing = await ctx.db
    .select({
      id: passkeyCredentials.credentialId,
      transports: passkeyCredentials.transports,
    })
    .from(passkeyCredentials)
    .where(
      and(
        eq(passkeyCredentials.userId, actor.userId),
        isNull(passkeyCredentials.revokedAt),
      ),
    );

  const options = await generateRegistrationOptions({
    rpName: ctx.config.rpName,
    rpID: ctx.config.rpId,
    userName: user.email,
    userDisplayName: user.displayName,
    userID: uuidToBytes(actor.userId),
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.id,
      transports: c.transports,
    })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
  });
  const challengeId = await storeChallenge(
    ctx,
    options.challenge,
    "registration",
    actor.userId,
  );
  return { options, challengeId };
}

export async function verifyPasskeyRegistration(
  ctx: ServerCtx,
  actor: AccessContext | null,
  challengeId: string | undefined,
  response: RegistrationResponseJSON,
  rawLabel: string,
): Promise<{ passkeyId: string }> {
  if (!actor || actor.status === "suspended") {
    throw new AuthError("not_signed_in", "Please sign in first.");
  }
  const { challenge, userId } = await takeChallenge(
    ctx,
    challengeId,
    "registration",
  );
  if (userId !== actor.userId)
    throw new AuthError("challenge_invalid", "Please try again.");

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: ctx.config.origin,
      expectedRPID: ctx.config.rpId,
      requireUserVerification: true,
    });
  } catch {
    throw new AuthError(
      "verification_failed",
      "We couldn't verify that passkey. Please try again.",
    );
  }
  if (!verification.verified) {
    throw new AuthError(
      "verification_failed",
      "We couldn't verify that passkey. Please try again.",
    );
  }
  const info = verification.registrationInfo;
  const label = rawLabel.trim().slice(0, 60) || "Passkey";
  const [row] = await ctx.db
    .insert(passkeyCredentials)
    .values({
      userId: actor.userId,
      credentialId: info.credential.id,
      publicKey: info.credential.publicKey,
      signCount: info.credential.counter,
      transports: info.credential.transports ?? [],
      deviceLabel: label,
      deviceType: info.credentialDeviceType,
      backedUp: info.credentialBackedUp,
      createdAt: ctx.now(),
    })
    .returning({ id: passkeyCredentials.id });
  if (!row) throw new Error("Failed to store passkey");
  await writeAudit(ctx, {
    action: "auth.passkey.added",
    actorId: actor.userId,
    entityType: "passkey_credential",
    entityId: row.id,
  });
  return { passkeyId: row.id };
}

// ---------------------------------------------------------------------------
// Passkey sign-in (discoverable credentials, works with autofill)
// ---------------------------------------------------------------------------

export async function passkeySignInOptions(ctx: ServerCtx): Promise<{
  options: PublicKeyCredentialRequestOptionsJSON;
  challengeId: string;
}> {
  await enforceRateLimit(ctx, RATE_LIMITS.passkeyOptions, ctx.ipHash);
  const options = await generateAuthenticationOptions({
    rpID: ctx.config.rpId,
    userVerification: "required",
  });
  const challengeId = await storeChallenge(
    ctx,
    options.challenge,
    "authentication",
    null,
  );
  return { options, challengeId };
}

export async function verifyPasskeySignIn(
  ctx: ServerCtx,
  challengeId: string | undefined,
  response: AuthenticationResponseJSON,
): Promise<{ token: string; expiresAt: Date; userId: string }> {
  await enforceRateLimit(ctx, RATE_LIMITS.passkeySignIn, ctx.ipHash);
  const { challenge } = await takeChallenge(ctx, challengeId, "authentication");
  const cred = await verifyAssertion(
    ctx,
    challenge,
    response,
    "auth.signin.failed",
    "That passkey didn't work. Try again or use an email link.",
  );
  const session = await createSession(ctx, cred.userId, "passkey");
  await writeAudit(ctx, {
    action: "auth.signin.passkey",
    actorId: cred.userId,
    entityType: "passkey_credential",
    entityId: cred.id,
  });
  return { ...session, userId: cred.userId };
}

// ---------------------------------------------------------------------------
// Passkey confirmation after a magic link (second step, design.md 2026-11-11)
// ---------------------------------------------------------------------------

/**
 * Options for confirming a passkey while already signed in (after a magic
 * link). Limited to the actor's own active passkeys, so the browser only
 * offers theirs.
 */
export async function passkeyConfirmOptions(
  ctx: ServerCtx,
  actor: AccessContext | null,
): Promise<{
  options: PublicKeyCredentialRequestOptionsJSON;
  challengeId: string;
}> {
  if (!actor || actor.status === "suspended") {
    throw new AuthError("not_signed_in", "Please sign in first.");
  }
  await enforceRateLimit(ctx, RATE_LIMITS.passkeyOptions, ctx.ipHash);
  const creds = await ctx.db
    .select({
      id: passkeyCredentials.credentialId,
      transports: passkeyCredentials.transports,
    })
    .from(passkeyCredentials)
    .where(
      and(
        eq(passkeyCredentials.userId, actor.userId),
        isNull(passkeyCredentials.revokedAt),
      ),
    );
  if (creds.length === 0) {
    throw new AuthError("not_found", "You don't have a passkey yet.");
  }
  const options = await generateAuthenticationOptions({
    rpID: ctx.config.rpId,
    userVerification: "required",
    allowCredentials: creds.map((c) => ({
      id: c.id,
      transports: c.transports,
    })),
  });
  const challengeId = await storeChallenge(
    ctx,
    options.challenge,
    "authentication",
    actor.userId,
  );
  return { options, challengeId };
}

/**
 * Verify the passkey confirmation. It doesn't change what the session can
 * do (a magic link alone is a full sign-in); it proves possession of the
 * passkey and is audited.
 */
export async function verifyPasskeyConfirm(
  ctx: ServerCtx,
  actor: AccessContext | null,
  challengeId: string | undefined,
  response: AuthenticationResponseJSON,
): Promise<void> {
  if (!actor || actor.status === "suspended") {
    throw new AuthError("not_signed_in", "Please sign in first.");
  }
  await enforceRateLimit(ctx, RATE_LIMITS.passkeySignIn, ctx.ipHash);
  const { challenge, userId } = await takeChallenge(
    ctx,
    challengeId,
    "authentication",
  );
  if (userId !== actor.userId)
    throw new AuthError("challenge_invalid", "Please try again.");
  const cred = await verifyAssertion(
    ctx,
    challenge,
    response,
    "auth.passkey.confirm_failed",
    "That passkey didn't work. Try again, or continue without it.",
  );
  if (cred.userId !== actor.userId) {
    await writeAudit(ctx, {
      action: "auth.passkey.confirm_failed",
      actorId: actor.userId,
      entityType: "passkey_credential",
      after: { reason: "other_users_credential" },
    });
    throw new AuthError(
      "verification_failed",
      "That passkey belongs to a different account.",
    );
  }
  await writeAudit(ctx, {
    action: "auth.passkey.confirmed",
    actorId: actor.userId,
    entityType: "passkey_credential",
    entityId: cred.id,
  });
}

/**
 * Check a WebAuthn assertion against a stored, non-revoked credential and
 * bump its counter. Failures are audited under `failAction` and thrown as
 * AuthError with `failMessage`.
 */
async function verifyAssertion(
  ctx: ServerCtx,
  challenge: string,
  response: AuthenticationResponseJSON,
  failAction: Extract<AuditAction, "auth.signin.failed" | "auth.passkey.confirm_failed">,
  failMessage: string,
): Promise<{ id: string; userId: string }> {
  const fail = async (
    reason: string,
    userId: string | null = null,
  ): Promise<never> => {
    await writeAudit(ctx, {
      action: failAction,
      actorId: userId,
      entityType: "passkey_credential",
      after: { reason },
    });
    throw new AuthError("verification_failed", failMessage);
  };

  // Revoked passkeys are excluded here, so they can never sign in.
  const [cred] = await ctx.db
    .select({
      id: passkeyCredentials.id,
      userId: passkeyCredentials.userId,
      credentialId: passkeyCredentials.credentialId,
      publicKey: passkeyCredentials.publicKey,
      signCount: passkeyCredentials.signCount,
      transports: passkeyCredentials.transports,
      status: users.status,
    })
    .from(passkeyCredentials)
    .innerJoin(users, eq(users.id, passkeyCredentials.userId))
    .where(
      and(
        eq(passkeyCredentials.credentialId, response.id),
        isNull(passkeyCredentials.revokedAt),
      ),
    );
  if (!cred) return fail("unknown_or_revoked_credential");
  if (cred.status === "suspended") return fail("user_deactivated", cred.userId);

  const userHandle = response.response.userHandle;
  if (userHandle) {
    const handleUserId = bytesToUuid(Buffer.from(userHandle, "base64url"));
    if (handleUserId !== cred.userId)
      return fail("user_handle_mismatch", cred.userId);
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: ctx.config.origin,
      expectedRPID: ctx.config.rpId,
      requireUserVerification: true,
      credential: {
        id: cred.credentialId,
        publicKey: new Uint8Array(cred.publicKey),
        counter: cred.signCount,
        transports: cred.transports,
      },
    });
  } catch {
    return fail("verification_error", cred.userId);
  }
  if (!verification.verified) return fail("not_verified", cred.userId);

  await ctx.db
    .update(passkeyCredentials)
    .set({
      signCount: verification.authenticationInfo.newCounter,
      lastUsedAt: ctx.now(),
    })
    .where(eq(passkeyCredentials.id, cred.id));
  return { id: cred.id, userId: cred.userId };
}

// ---------------------------------------------------------------------------
// Passkey management
// ---------------------------------------------------------------------------

export async function listPasskeys(ctx: Pick<ServerCtx, "db">, userId: string) {
  return ctx.db
    .select({
      id: passkeyCredentials.id,
      deviceLabel: passkeyCredentials.deviceLabel,
      createdAt: passkeyCredentials.createdAt,
      lastUsedAt: passkeyCredentials.lastUsedAt,
      backedUp: passkeyCredentials.backedUp,
    })
    .from(passkeyCredentials)
    .where(
      and(
        eq(passkeyCredentials.userId, userId),
        isNull(passkeyCredentials.revokedAt),
      ),
    )
    .orderBy(passkeyCredentials.createdAt);
}

/**
 * Revoke one of your own passkeys. Staff whose screens require a passkey
 * can't remove their last one (they would lock themselves out of those
 * screens); they must add another first.
 */
export async function revokeOwnPasskey(
  ctx: ServerCtx,
  actor: AccessContext | null,
  passkeyId: string,
): Promise<void> {
  if (!actor) throw new AuthError("not_signed_in", "Please sign in first.");
  const active = await listPasskeys(ctx, actor.userId);
  if (!active.some((p) => p.id === passkeyId)) {
    throw new AuthError("not_found", "That passkey was not found.");
  }
  if (active.length === 1 && needsPasskey(actor.roles)) {
    throw new AuthError(
      "last_passkey",
      "Your role needs at least one passkey. Add another passkey before removing this one.",
    );
  }
  await ctx.db
    .update(passkeyCredentials)
    .set({ revokedAt: ctx.now() })
    .where(
      and(
        eq(passkeyCredentials.id, passkeyId),
        eq(passkeyCredentials.userId, actor.userId),
      ),
    );
  await writeAudit(ctx, {
    action: "auth.passkey.revoked",
    actorId: actor.userId,
    entityType: "passkey_credential",
    entityId: passkeyId,
    after: { by: "owner" },
  });
}
