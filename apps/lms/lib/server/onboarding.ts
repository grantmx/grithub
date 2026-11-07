import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

// NOTE: correlated subqueries below name the outer column explicitly ("users"."id").
// Drizzle renders ${users.id} unqualified in single-table selects, which would
// silently bind to the subquery's own "id" column.
import {
  authTokens,
  cohorts,
  consentRecords,
  enrolments,
  passkeyCredentials,
  qualifications,
  users,
} from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import {
  type ExistingAccount,
  type ImportRow,
  validateLearnerCsv,
} from "@/lib/csv";
import { CURRENT_NOTICE, noticeSha256 } from "@/lib/popia";
import type { ServerCtx } from "./context";
import { writeAudit } from "./audit";
import { authorize } from "./auth";
import { invitationEmail, recoveryEmail, sendEmail } from "./email";
import { RATE_LIMITS, enforceRateLimit } from "./ratelimit";
import { revokeAllSessions } from "./session";
import { issueToken } from "./tokens";

/** Every admin operation: SDP admin + passkey (same rule as /admin). */
export const ADMIN: Requirement = {
  kind: "roles",
  anyOf: ["sdp_admin"],
  stepUp: true,
};

export class OnboardingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OnboardingError";
  }
}

const lower = (s: string) => s.trim().toLowerCase();

// ---------------------------------------------------------------------------
// Cohorts
// ---------------------------------------------------------------------------

export async function listQualifications(ctx: Pick<ServerCtx, "db">) {
  return ctx.db
    .select({ id: qualifications.id, title: qualifications.title })
    .from(qualifications)
    .where(isNull(qualifications.archivedAt))
    .orderBy(qualifications.title);
}

export async function listCohorts(ctx: Pick<ServerCtx, "db">) {
  return ctx.db
    .select({
      id: cohorts.id,
      name: cohorts.name,
      startsOn: cohorts.startsOn,
      endsOn: cohorts.endsOn,
      qualificationTitle: qualifications.title,
      learners: sql<number>`(select count(*)::int from enrolments e where e.cohort_id = "cohorts"."id")`,
    })
    .from(cohorts)
    .innerJoin(qualifications, eq(qualifications.id, cohorts.qualificationId))
    .orderBy(desc(cohorts.startsOn));
}

export async function createCohort(
  ctx: ServerCtx,
  actor: AccessContext | null,
  input: {
    qualificationId: string;
    name: string;
    startsOn: string;
    endsOn: string;
  },
): Promise<string> {
  const admin = await authorize(ctx, actor, ADMIN, "admin.createCohort");
  const name = input.name.trim();
  if (!name || name.length > 120)
    throw new OnboardingError("Enter a cohort name (up to 120 characters).");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.startsOn) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.endsOn)
  ) {
    throw new OnboardingError("Enter valid start and end dates.");
  }
  if (input.endsOn < input.startsOn)
    throw new OnboardingError(
      "The end date must be on or after the start date.",
    );
  try {
    const [row] = await ctx.db
      .insert(cohorts)
      .values({
        qualificationId: input.qualificationId,
        name,
        startsOn: input.startsOn,
        endsOn: input.endsOn,
      })
      .returning({ id: cohorts.id });
    await writeAudit(ctx, {
      action: "admin.cohort.created",
      actorId: admin.userId,
      entityType: "cohort",
      entityId: row!.id,
    });
    return row!.id;
  } catch (e) {
    if (String((e as { cause?: { code?: string } }).cause?.code) === "23505") {
      throw new OnboardingError(
        "A cohort with that name already exists for this qualification.",
      );
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

async function existingAccounts(
  ctx: Pick<ServerCtx, "db">,
  cohortId: string,
  emailsLower: string[],
): Promise<Map<string, ExistingAccount & { userId: string }>> {
  const result = new Map<string, ExistingAccount & { userId: string }>();
  if (emailsLower.length === 0) return result;
  const rows = await ctx.db
    .select({
      id: users.id,
      emailLower: sql<string>`lower(${users.email})`,
      status: users.status,
      enrolled: sql<boolean>`exists(select 1 from enrolments e where e.user_id = "users"."id" and e.cohort_id = ${cohortId})`,
    })
    .from(users)
    .where(inArray(sql`lower(${users.email})`, emailsLower));
  for (const r of rows) {
    result.set(r.emailLower, {
      userId: r.id,
      status: r.status,
      enrolledInCohort: r.enrolled,
    });
  }
  return result;
}

async function inviteOne(
  ctx: ServerCtx,
  adminId: string,
  cohortId: string,
  name: string,
  email: string,
  existing: (ExistingAccount & { userId: string }) | undefined,
): Promise<{ userId: string; invited: boolean }> {
  if (existing?.status === "suspended")
    throw new OnboardingError("That account is deactivated.");
  let userId = existing?.userId;
  if (!userId) {
    const [created] = await ctx.db
      .insert(users)
      .values({ displayName: name, email: email.trim(), status: "invited" })
      .returning({ id: users.id });
    userId = created!.id;
  }
  if (!existing?.enrolledInCohort) {
    await ctx.db
      .insert(enrolments)
      .values({ userId, cohortId })
      .onConflictDoNothing();
  }
  // Active users are simply enrolled; invited users get a (new) invitation.
  if (existing?.status === "active") return { userId, invited: false };

  const token = await issueToken(ctx, {
    userId,
    purpose: "invitation",
    cohortId,
    createdBy: adminId,
  });
  await sendEmail(
    invitationEmail(email.trim(), name, `${ctx.config.appUrl}/setup/${token}`),
  );
  await writeAudit(ctx, {
    action: "admin.invite.sent",
    actorId: adminId,
    entityType: "user",
    entityId: userId,
    after: { cohortId },
  });
  return { userId, invited: true };
}

export async function inviteLearner(
  ctx: ServerCtx,
  actor: AccessContext | null,
  input: { cohortId: string; name: string; email: string },
): Promise<{ userId: string; invited: boolean }> {
  const admin = await authorize(ctx, actor, ADMIN, "admin.inviteLearner");
  const check = validateLearnerCsv(
    `name,email\n"${input.name.replace(/"/g, '""')}","${input.email.replace(/"/g, '""')}"`,
    () => undefined,
  );
  const row = check.ok ? check.rows[0] : undefined;
  if (!row || !row.status.ok) {
    throw new OnboardingError(
      row && !row.status.ok
        ? row.status.error
        : "Enter a name and a valid email.",
    );
  }
  const existing = (
    await existingAccounts(ctx, input.cohortId, [lower(input.email)])
  ).get(lower(input.email));
  if (existing?.enrolledInCohort && existing.status === "active") {
    throw new OnboardingError(
      "That learner is already enrolled in this cohort.",
    );
  }
  return inviteOne(
    ctx,
    admin.userId,
    input.cohortId,
    row.name,
    row.email,
    existing,
  );
}

export async function previewLearnerImport(
  ctx: ServerCtx,
  actor: AccessContext | null,
  cohortId: string,
  csvText: string,
): Promise<{ ok: true; rows: ImportRow[] } | { ok: false; error: string }> {
  await authorize(ctx, actor, ADMIN, "admin.previewImport");
  // Pre-parse to find emails, then validate against what already exists.
  const firstPass = validateLearnerCsv(csvText, () => undefined);
  if (!firstPass.ok) return firstPass;
  const known = await existingAccounts(
    ctx,
    cohortId,
    firstPass.rows.filter((r) => r.email).map((r) => lower(r.email)),
  );
  return validateLearnerCsv(csvText, (e) => known.get(e));
}

/** Re-validates on the server, then imports and invites only valid rows. */
export async function confirmLearnerImport(
  ctx: ServerCtx,
  actor: AccessContext | null,
  cohortId: string,
  csvText: string,
): Promise<{ imported: number; invited: number; skipped: number }> {
  const admin = await authorize(ctx, actor, ADMIN, "admin.confirmImport");
  const preview = await previewLearnerImport(ctx, actor, cohortId, csvText);
  if (!preview.ok) throw new OnboardingError(preview.error);
  const valid = preview.rows.filter((r) => r.status.ok);
  const known = await existingAccounts(
    ctx,
    cohortId,
    valid.map((r) => lower(r.email)),
  );
  let invited = 0;
  for (const r of valid) {
    const res = await inviteOne(
      ctx,
      admin.userId,
      cohortId,
      r.name,
      r.email,
      known.get(lower(r.email)),
    );
    if (res.invited) invited++;
  }
  const summary = {
    imported: valid.length,
    invited,
    skipped: preview.rows.length - valid.length,
  };
  await writeAudit(ctx, {
    action: "admin.import.completed",
    actorId: admin.userId,
    entityType: "cohort",
    entityId: cohortId,
    after: summary,
  });
  return summary;
}

export async function resendInvitation(
  ctx: ServerCtx,
  actor: AccessContext | null,
  userId: string,
  cohortId: string,
): Promise<void> {
  const admin = await authorize(ctx, actor, ADMIN, "admin.resendInvitation");
  const [user] = await ctx.db
    .select({
      name: users.displayName,
      email: users.email,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, userId));
  if (!user || user.status !== "invited")
    throw new OnboardingError(
      "Only invited (not yet set up) learners can be re-invited.",
    );
  const token = await issueToken(ctx, {
    userId,
    purpose: "invitation",
    cohortId,
    createdBy: admin.userId,
  });
  await sendEmail(
    invitationEmail(
      user.email,
      user.name,
      `${ctx.config.appUrl}/setup/${token}`,
    ),
  );
  await writeAudit(ctx, {
    action: "admin.invite.sent",
    actorId: admin.userId,
    entityType: "user",
    entityId: userId,
    after: { cohortId, resend: true },
  });
}

// ---------------------------------------------------------------------------
// Deactivation and admin-verified recovery
// ---------------------------------------------------------------------------

async function revokeOutstandingTokens(
  ctx: Pick<ServerCtx, "db" | "now">,
  userId: string,
) {
  await ctx.db
    .update(authTokens)
    .set({ revokedAt: ctx.now() })
    .where(
      and(
        eq(authTokens.userId, userId),
        isNull(authTokens.usedAt),
        isNull(authTokens.revokedAt),
      ),
    );
}

export async function deactivateUser(
  ctx: ServerCtx,
  actor: AccessContext | null,
  userId: string,
): Promise<void> {
  const admin = await authorize(ctx, actor, ADMIN, "admin.deactivateUser");
  if (userId === admin.userId)
    throw new OnboardingError("You can't deactivate your own account.");
  await ctx.db
    .update(users)
    .set({ status: "suspended" })
    .where(eq(users.id, userId));
  await revokeAllSessions(ctx, userId);
  await revokeOutstandingTokens(ctx, userId);
  await writeAudit(ctx, {
    action: "admin.user.deactivated",
    actorId: admin.userId,
    entityType: "user",
    entityId: userId,
  });
}

export const VERIFICATION_METHODS = [
  "in_person",
  "video_call",
  "phone_call_known_number",
] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

/**
 * Admin-verified recovery (lost device). The admin records HOW identity was
 * checked and WHY. All of the user's passkeys and sessions are revoked and a
 * single-use 30-minute recovery link is emailed. The user must add a new passkey.
 */
export async function startRecovery(
  ctx: ServerCtx,
  actor: AccessContext | null,
  input: { userId: string; verificationMethod: string; reason: string },
): Promise<void> {
  const admin = await authorize(ctx, actor, ADMIN, "admin.startRecovery");
  if (
    !VERIFICATION_METHODS.includes(
      input.verificationMethod as VerificationMethod,
    )
  ) {
    throw new OnboardingError("Choose how you verified the person's identity.");
  }
  const reason = input.reason.trim();
  if (reason.length < 5 || reason.length > 500)
    throw new OnboardingError("Give a short reason (5–500 characters).");
  if (input.userId === admin.userId) {
    throw new OnboardingError("Another SDP admin must recover your account.");
  }
  const [user] = await ctx.db
    .select({ email: users.email, status: users.status })
    .from(users)
    .where(eq(users.id, input.userId));
  if (!user) throw new OnboardingError("User not found.");
  if (user.status === "suspended")
    throw new OnboardingError("That account is deactivated.");

  const now = ctx.now();
  await ctx.db
    .update(passkeyCredentials)
    .set({ revokedAt: now })
    .where(
      and(
        eq(passkeyCredentials.userId, input.userId),
        isNull(passkeyCredentials.revokedAt),
      ),
    );
  await revokeAllSessions(ctx, input.userId);
  await revokeOutstandingTokens(ctx, input.userId);
  const token = await issueToken(ctx, {
    userId: input.userId,
    purpose: "recovery",
    createdBy: admin.userId,
  });
  await sendEmail(
    recoveryEmail(user.email, `${ctx.config.appUrl}/auth/link/${token}`),
  );
  await writeAudit(ctx, {
    action: "auth.recovery.started",
    actorId: admin.userId,
    entityType: "user",
    entityId: input.userId,
    after: { verificationMethod: input.verificationMethod, reason },
  });
}

// ---------------------------------------------------------------------------
// People list with invitation status
// ---------------------------------------------------------------------------

export type PersonStatus = "active" | "invited" | "expired" | "deactivated";
export const PERSON_FILTERS = [
  "all",
  "invited",
  "active",
  "expired",
  "deactivated",
] as const;
export type PersonFilter = (typeof PERSON_FILTERS)[number];

export async function listPeople(
  ctx: ServerCtx,
  actor: AccessContext | null,
  cohortId: string,
  filter: PersonFilter = "all",
) {
  await authorize(ctx, actor, ADMIN, "admin.listPeople");
  const now = ctx.now();
  const rows = await ctx.db
    .select({
      userId: users.id,
      name: users.displayName,
      email: users.email,
      userStatus: users.status,
      passkeys: sql<number>`(select count(*)::int from passkey_credentials p where p.user_id = "users"."id" and p.revoked_at is null)`,
      inviteExpiresAt: sql<Date | null>`(select t.expires_at from auth_tokens t where t.user_id = "users"."id" and t.purpose = 'invitation' and t.used_at is null and t.revoked_at is null order by t.created_at desc limit 1)`,
    })
    .from(enrolments)
    .innerJoin(users, eq(users.id, enrolments.userId))
    .where(eq(enrolments.cohortId, cohortId))
    .orderBy(users.displayName);

  const people = rows.map((r) => {
    let status: PersonStatus;
    if (r.userStatus === "suspended") status = "deactivated";
    else if (r.userStatus === "active") status = "active";
    else
      status =
        r.inviteExpiresAt && new Date(r.inviteExpiresAt) > now
          ? "invited"
          : "expired";
    return { ...r, status };
  });
  return filter === "all" ? people : people.filter((p) => p.status === filter);
}

// ---------------------------------------------------------------------------
// First-time setup (the invited user)
// ---------------------------------------------------------------------------

export async function confirmDetails(
  ctx: ServerCtx,
  actor: AccessContext | null,
  displayName: string,
): Promise<void> {
  if (!actor) throw new OnboardingError("Please sign in first.");
  await enforceRateLimit(ctx, RATE_LIMITS.setup, actor.userId);
  const name = displayName.trim();
  if (!name || name.length > 120)
    throw new OnboardingError("Enter your name (up to 120 characters).");
  await ctx.db
    .update(users)
    .set({ displayName: name })
    .where(eq(users.id, actor.userId));
}

/** Record acceptance of the CURRENT notice (version + text hash + time). */
export async function acceptNotice(
  ctx: ServerCtx,
  actor: AccessContext | null,
  input: { version: string; accepted: boolean },
): Promise<void> {
  if (!actor) throw new OnboardingError("Please sign in first.");
  await enforceRateLimit(ctx, RATE_LIMITS.setup, actor.userId);
  if (!input.accepted)
    throw new OnboardingError("Please tick the box to accept the notice.");
  if (input.version !== CURRENT_NOTICE.version) {
    throw new OnboardingError(
      "The notice has changed. Please read the updated version.",
    );
  }
  const now = ctx.now();
  await ctx.db.insert(consentRecords).values({
    userId: actor.userId,
    noticeVersion: CURRENT_NOTICE.version,
    noticeSha256: noticeSha256(),
    acceptedAt: now,
    ipHash: ctx.ipHash,
  });
  await ctx.db
    .update(users)
    .set({
      status: "active",
      popiaNoticeAcceptedAt: now,
      popiaNoticeVersion: CURRENT_NOTICE.version,
    })
    .where(eq(users.id, actor.userId));
  await writeAudit(ctx, {
    action: "consent.accepted",
    actorId: actor.userId,
    entityType: "user",
    entityId: actor.userId,
    after: { noticeVersion: CURRENT_NOTICE.version },
  });
}
