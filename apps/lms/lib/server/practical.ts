import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  appeals,
  assessmentDecisions,
  assessmentSchedules,
  briefCriteria,
  briefVariants,
  enrolments,
  evidenceItems,
  modules,
  practicalBriefs,
  submissions,
} from "db";
import type { AccessContext, StaffRole } from "@/lib/access";
import {
  checkLink,
  cleanFileName,
  fileProblem,
  MAX_EVIDENCE_ITEMS,
  MAX_FILE_BYTES,
  ALLOWED_TYPES,
} from "@/lib/evidenceRules";
import { pickQuestion, rngFromSeed, seedFor } from "@/lib/randomization";
import { APPEAL_WINDOW_DAYS } from "./assessments";
import { writeAudit } from "./audit";
import type { ServerCtx } from "./context";
import { sha256Hex } from "./crypto";
import { evidenceStore, SIGNED_URL_TTL_MS } from "./evidenceStore";
import { requireEnrolment } from "./learning";
import { RATE_LIMITS, enforceRateLimit } from "./ratelimit";
import { cohortScope, inScope } from "./staffScope";
import { staffMayOpen, virusScanner } from "./virusScan";

/**
 * Practical assessments, learner side (Form 5 section 4.3; design.md L8;
 * design-gate decisions 2026-11-08). Each attempt at a brief is a
 * submission with a seeded, stored variant (seed = learner : brief : attempt,
 * preferring variants not done before). Evidence collects in a draft until
 * "Submit for assessment". Observed briefs are started by the assessor on
 * the assessment day. Same release, reassessment and appeal rules as
 * knowledge summatives. There is no workplace module, logbook or mentor.
 */

export class PracticalError extends Error {
  constructor(
    public readonly code:
      | "not_found"
      | "not_open"
      | "no_attempts_left"
      | "awaiting_result"
      | "submitted"
      | "invalid"
      | "storage_off"
      | "too_many"
      | "appeal_closed",
    message: string,
  ) {
    super(message);
    this.name = "PracticalError";
  }
}

type Db = Pick<ServerCtx, "db">;
type Ctx = Pick<ServerCtx, "db" | "now" | "ipHash">;
type RateCtx = Pick<ServerCtx, "db" | "now" | "ipHash" | "config">;
type Brief = typeof practicalBriefs.$inferSelect;
type Submission = typeof submissions.$inferSelect;

/** Who may open practical evidence besides the learner (decision 2026-11-08). */
export const EVIDENCE_ROLES: readonly StaffRole[] = ["assessor", "moderator", "external_evaluator"];

// ---------------------------------------------------------------------------
// Decisions and allowance
// ---------------------------------------------------------------------------

/** The current (not superseded) decision for a submission. */
export async function currentSubmissionDecision(ctx: Db, submissionId: string) {
  const [d] = await ctx.db
    .select()
    .from(assessmentDecisions)
    .where(
      and(
        eq(assessmentDecisions.submissionId, submissionId),
        sql`NOT EXISTS (SELECT 1 FROM "assessment_decisions" "newer" WHERE "newer"."supersedes_id" = "assessment_decisions"."id")`,
      ),
    )
    .limit(1);
  return d ?? null;
}

async function submissionsFor(ctx: Db, enrolmentId: string, briefId: string) {
  return ctx.db
    .select()
    .from(submissions)
    .where(and(eq(submissions.enrolmentId, enrolmentId), eq(submissions.briefId, briefId)))
    .orderBy(asc(submissions.attemptNo));
}

/**
 * Next attempt at a brief: allowed up to the brief's limit plus reassessments
 * ordered on appeal, and only after a released Not yet competent (or a
 * reassess appeal) on the previous attempt.
 */
export async function practicalAllowance(
  ctx: Db,
  enrolmentId: string,
  brief: Brief,
): Promise<
  | { ok: true; attemptNo: number; allowed: number; draft: Submission | null }
  | { ok: false; reason: "no_attempts_left" | "awaiting_result"; allowed: number }
> {
  const list = await submissionsFor(ctx, enrolmentId, brief.id);
  const ids = list.map((s) => s.id);
  const grants = ids.length
    ? Number(
        (
          await ctx.db
            .select({ n: sql<number>`count(*)::int` })
            .from(appeals)
            .innerJoin(assessmentDecisions, eq(assessmentDecisions.id, appeals.decisionId))
            .where(and(inArray(assessmentDecisions.submissionId, ids), eq(appeals.status, "reassess")))
        )[0]?.n ?? 0,
      )
    : 0;
  const allowed = brief.maxAttempts + grants;
  const last = list.at(-1);
  if (!last) return { ok: true, attemptNo: 1, allowed, draft: null };
  if (last.status === "draft") return { ok: true, attemptNo: last.attemptNo, allowed, draft: last };
  if (list.length >= allowed) return { ok: false, reason: "no_attempts_left", allowed };
  const d = await currentSubmissionDecision(ctx, last.id);
  const nyc = d?.releasedAt != null && d.outcome === "not_yet_competent";
  const [reassess] = d
    ? await ctx.db
        .select({ id: appeals.id })
        .from(appeals)
        .where(and(eq(appeals.decisionId, d.id), eq(appeals.status, "reassess")))
    : [];
  if (!nyc && !reassess) return { ok: false, reason: "awaiting_result", allowed };
  return { ok: true, attemptNo: last.attemptNo + 1, allowed, draft: null };
}

/** Seeded variant for an attempt, preferring variants this learner hasn't had. */
async function assignVariant(ctx: Db, userId: string, enrolmentId: string, briefId: string, attemptNo: number) {
  const variants = await ctx.db
    .select({ id: briefVariants.id })
    .from(briefVariants)
    .where(and(eq(briefVariants.briefId, briefId), eq(briefVariants.status, "active")));
  if (variants.length === 0) throw new PracticalError("not_found", "This task isn't ready yet. Please tell your facilitator.");
  const previous = await submissionsFor(ctx, enrolmentId, briefId);
  const lastSeen = new Map<string, number>();
  for (const s of previous) lastSeen.set(s.briefVariantId, Math.max(lastSeen.get(s.briefVariantId) ?? 0, s.attemptNo));
  const seed = seedFor(userId, briefId, attemptNo);
  const { questionId: variantId } = pickQuestion(
    variants.map((v) => v.id),
    lastSeen,
    rngFromSeed(seed),
  );
  return { variantId, seed };
}

/** Create (or return the racing request's) submission row. */
async function createSubmission(
  ctx: Ctx,
  values: { enrolmentId: string; userId: string; briefId: string; attemptNo: number; scheduleId: string; observed: boolean },
  actorId: string,
): Promise<Submission> {
  const { variantId, seed } = await assignVariant(ctx, values.userId, values.enrolmentId, values.briefId, values.attemptNo);
  const now = ctx.now();
  const [row] = await ctx.db
    .insert(submissions)
    .values({
      enrolmentId: values.enrolmentId,
      briefId: values.briefId,
      briefVariantId: variantId,
      attemptNo: values.attemptNo,
      seed,
      scheduleId: values.scheduleId,
      observed: values.observed,
      ...(values.observed ? { status: "submitted" as const, submittedAt: now } : {}),
    })
    .onConflictDoNothing()
    .returning();
  if (row) {
    await writeAudit(ctx, {
      action: values.observed ? "practical.observation.started" : "practical.submission.started",
      actorId,
      entityType: "submission",
      entityId: row.id,
      after: { attemptNo: values.attemptNo },
    });
    return row;
  }
  const [existing] = await ctx.db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.enrolmentId, values.enrolmentId),
        eq(submissions.briefId, values.briefId),
        eq(submissions.attemptNo, values.attemptNo),
      ),
    );
  return existing!;
}

// ---------------------------------------------------------------------------
// Listing and the brief page
// ---------------------------------------------------------------------------

export type PracticalStatus =
  | "not_started"
  | "draft"
  | "submitted"
  | "competent"
  | "not_yet_competent"
  | "observed_upcoming"
  | "upcoming"
  | "closed";

export type PracticalTask = {
  scheduleId: string;
  title: string;
  moduleCode: string;
  mode: "submission" | "observed";
  opensAt: Date;
  closesAt: Date;
  status: PracticalStatus;
  attemptsUsed: number;
  attemptsAllowed: number;
};

async function statusOf(ctx: Db, list: Submission[], now: Date, schedule: { opensAt: Date; closesAt: Date }, mode: string): Promise<PracticalStatus> {
  const last = list.at(-1);
  if (last?.status === "draft") return "draft";
  if (last) {
    const d = await currentSubmissionDecision(ctx, last.id);
    if (d?.releasedAt) return d.outcome;
    return "submitted";
  }
  if (now < schedule.opensAt) return mode === "observed" ? "observed_upcoming" : "upcoming";
  if (now > schedule.closesAt) return "closed";
  return mode === "observed" ? "observed_upcoming" : "not_started";
}

export async function listPracticalTasks(ctx: Ctx, actor: AccessContext, qualificationId: string): Promise<PracticalTask[]> {
  const { enrolmentId, cohortId } = await requireEnrolment(ctx, actor, qualificationId);
  const rows = await ctx.db
    .select({ schedule: assessmentSchedules, brief: practicalBriefs, moduleCode: modules.code })
    .from(assessmentSchedules)
    .innerJoin(practicalBriefs, eq(practicalBriefs.id, assessmentSchedules.briefId))
    .innerJoin(modules, eq(modules.id, practicalBriefs.moduleId))
    .where(
      and(
        eq(assessmentSchedules.cohortId, cohortId),
        eq(modules.qualificationId, qualificationId),
        eq(practicalBriefs.status, "published"),
      ),
    )
    .orderBy(asc(assessmentSchedules.opensAt));
  const now = ctx.now();
  const out: PracticalTask[] = [];
  for (const { schedule, brief, moduleCode } of rows) {
    const list = await submissionsFor(ctx, enrolmentId, brief.id);
    const allowance = await practicalAllowance(ctx, enrolmentId, brief);
    out.push({
      scheduleId: schedule.id,
      title: brief.title,
      moduleCode,
      mode: brief.mode,
      opensAt: schedule.opensAt,
      closesAt: schedule.closesAt,
      status: await statusOf(ctx, list, now, schedule, brief.mode),
      attemptsUsed: list.filter((s) => s.status === "submitted").length,
      attemptsAllowed: allowance.allowed,
    });
  }
  return out;
}

async function loadSchedule(ctx: Db, scheduleId: string) {
  const [row] = await ctx.db
    .select({ schedule: assessmentSchedules, brief: practicalBriefs, qualificationId: modules.qualificationId, moduleCode: modules.code })
    .from(assessmentSchedules)
    .innerJoin(practicalBriefs, eq(practicalBriefs.id, assessmentSchedules.briefId))
    .innerJoin(modules, eq(modules.id, practicalBriefs.moduleId))
    .where(eq(assessmentSchedules.id, scheduleId));
  if (!row || row.brief.status !== "published") throw new PracticalError("not_found", "Task not found.");
  return row;
}

export type EvidenceView = {
  id: string;
  kind: "file" | "link";
  source: "learner" | "assessor";
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  linkUrl: string | null;
  linkHost: string | null;
  scanStatus: "not_scanned" | "pending" | "clean" | "infected";
  createdAt: Date;
};

async function evidenceOf(ctx: Db, submissionId: string): Promise<EvidenceView[]> {
  return ctx.db
    .select({
      id: evidenceItems.id,
      kind: evidenceItems.kind,
      source: evidenceItems.source,
      fileName: evidenceItems.fileName,
      mimeType: evidenceItems.mimeType,
      sizeBytes: evidenceItems.sizeBytes,
      linkUrl: evidenceItems.linkUrl,
      linkHost: evidenceItems.linkHost,
      scanStatus: evidenceItems.scanStatus,
      createdAt: evidenceItems.createdAt,
    })
    .from(evidenceItems)
    .where(eq(evidenceItems.submissionId, submissionId))
    .orderBy(asc(evidenceItems.createdAt));
}

export async function criteriaOf(ctx: Db, briefId: string) {
  return ctx.db
    .select({ id: briefCriteria.id, code: briefCriteria.code, label: briefCriteria.label, guidance: briefCriteria.guidance })
    .from(briefCriteria)
    .where(eq(briefCriteria.briefId, briefId))
    .orderBy(asc(briefCriteria.sortOrder));
}

export type HistoryItem = {
  submissionId: string;
  attemptNo: number;
  status: "draft" | "submitted";
  observed: boolean;
  submittedAt: Date | null;
  result: null | {
    decisionId: string;
    outcome: "competent" | "not_yet_competent";
    feedback: string;
    releasedAt: Date;
    appeal:
      | { state: "can_appeal"; closesAt: Date }
      | { state: "closed" }
      | { state: "submitted"; status: "open" | "upheld" | "reassess"; outcomeNotes: string | null };
  };
};

async function historyOf(ctx: Ctx, list: Submission[]): Promise<HistoryItem[]> {
  const out: HistoryItem[] = [];
  for (const s of list) {
    let result: HistoryItem["result"] = null;
    const d = await currentSubmissionDecision(ctx, s.id);
    if (d?.releasedAt) {
      const [appeal] = await ctx.db.select().from(appeals).where(eq(appeals.decisionId, d.id));
      const closesAt = new Date(d.releasedAt.getTime() + APPEAL_WINDOW_DAYS * 86_400_000);
      result = {
        decisionId: d.id,
        outcome: d.outcome,
        feedback: d.feedback,
        releasedAt: d.releasedAt,
        appeal: appeal
          ? { state: "submitted", status: appeal.status, outcomeNotes: appeal.outcomeNotes }
          : ctx.now() <= closesAt
            ? { state: "can_appeal", closesAt }
            : { state: "closed" },
      };
    }
    out.push({ submissionId: s.id, attemptNo: s.attemptNo, status: s.status, observed: s.observed, submittedAt: s.submittedAt, result });
  }
  return out.reverse();
}

export type BriefPage = {
  scheduleId: string;
  qualificationId: string;
  moduleCode: string;
  title: string;
  mode: "submission" | "observed";
  instructions: string;
  opensAt: Date;
  closesAt: Date;
  status: PracticalStatus;
  variant: { label: string; instructions: string } | null;
  criteria: { code: string; label: string; guidance: string | null }[];
  draft: null | { submissionId: string; attemptNo: number; evidence: EvidenceView[]; linksConfirmed: boolean };
  attemptsAllowed: number;
  reason: "not_open" | "closed" | "no_attempts_left" | "awaiting_result" | null;
  uploadsEnabled: boolean;
  history: HistoryItem[];
};

/**
 * The learner's brief page. For evidence briefs inside the window, starts
 * (or resumes) the draft for the next allowed attempt, with its seeded variant.
 */
export async function getBriefPage(ctx: Ctx, actor: AccessContext, scheduleId: string): Promise<BriefPage> {
  const { schedule, brief, qualificationId, moduleCode } = await loadSchedule(ctx, scheduleId);
  const { enrolmentId, cohortId } = await requireEnrolment(ctx, actor, qualificationId);
  if (cohortId !== schedule.cohortId) throw new PracticalError("not_found", "Task not found.");
  const now = ctx.now();
  const allowance = await practicalAllowance(ctx, enrolmentId, brief);
  let reason: BriefPage["reason"] = null;
  if (now < schedule.opensAt) reason = "not_open";
  else if (now > schedule.closesAt) reason = "closed";
  else if (!allowance.ok) reason = allowance.reason;

  let draft: Submission | null = allowance.ok ? allowance.draft : null;
  if (!draft && allowance.ok && reason === null && brief.mode === "submission") {
    draft = await createSubmission(
      ctx,
      { enrolmentId, userId: actor.userId, briefId: brief.id, attemptNo: allowance.attemptNo, scheduleId, observed: false },
      actor.userId,
    );
  }
  const list = await submissionsFor(ctx, enrolmentId, brief.id);
  const showing = draft ?? list.at(-1) ?? null;
  const variant = showing
    ? (await ctx.db.select().from(briefVariants).where(eq(briefVariants.id, showing.briefVariantId)))[0]
    : null;
  return {
    scheduleId,
    qualificationId,
    moduleCode,
    title: brief.title,
    mode: brief.mode,
    instructions: brief.instructions,
    opensAt: schedule.opensAt,
    closesAt: schedule.closesAt,
    status: await statusOf(ctx, list, now, schedule, brief.mode),
    variant: variant ? { label: variant.label, instructions: variant.variantInstructions } : null,
    criteria: (await criteriaOf(ctx, brief.id)).map(({ code, label, guidance }) => ({ code, label, guidance })),
    draft: draft
      ? { submissionId: draft.id, attemptNo: draft.attemptNo, evidence: await evidenceOf(ctx, draft.id), linksConfirmed: draft.linksConfirmed }
      : null,
    attemptsAllowed: allowance.allowed,
    reason: draft ? null : reason,
    uploadsEnabled: evidenceStore().kind !== "none",
    history: (await historyOf(ctx, list)).filter((h) => h.status === "submitted"),
  };
}

// ---------------------------------------------------------------------------
// Evidence: uploads, links, removal
// ---------------------------------------------------------------------------

type Uploader = { submission: Submission; source: "learner" | "assessor" };

/**
 * Who may add evidence to a submission: the learner to their own draft (in
 * the window), or an assessor (in scope) to an observed submission without a
 * decision. Used for upload tokens and for confirming uploads.
 */
export async function uploaderFor(ctx: Ctx, actor: AccessContext, submissionId: string): Promise<Uploader> {
  const [row] = await ctx.db
    .select({ submission: submissions, userId: enrolments.userId, cohortId: enrolments.cohortId, schedule: assessmentSchedules })
    .from(submissions)
    .innerJoin(enrolments, eq(enrolments.id, submissions.enrolmentId))
    .leftJoin(assessmentSchedules, eq(assessmentSchedules.id, submissions.scheduleId))
    .where(eq(submissions.id, submissionId));
  if (!row) throw new PracticalError("not_found", "Submission not found.");
  if (row.userId === actor.userId && !row.submission.observed) {
    if (row.submission.status !== "draft") throw new PracticalError("submitted", "This work has been submitted and can't change.");
    if (row.schedule && ctx.now() > row.schedule.closesAt) throw new PracticalError("not_open", "This task has closed.");
    return { submission: row.submission, source: "learner" };
  }
  if (
    row.submission.observed &&
    actor.roles.has("assessor") &&
    actor.activePasskeys > 0 &&
    inScope(await cohortScope(ctx, actor, ["assessor"]), row.cohortId) &&
    !(await currentSubmissionDecision(ctx, submissionId))
  ) {
    return { submission: row.submission, source: "assessor" };
  }
  throw new PracticalError("not_found", "Submission not found.");
}

/** Every upload for a submission lives under this prefix (checked on token and confirm). */
export const uploadPrefix = (submissionId: string) => `evidence/${submissionId}/`;

async function evidenceCount(ctx: Db, submissionId: string) {
  const [r] = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(evidenceItems)
    .where(eq(evidenceItems.submissionId, submissionId));
  return Number(r?.n ?? 0);
}

/** Constraints for a client upload token (Vercel Blob handleUpload). */
export async function uploadPolicy(ctx: RateCtx, actor: AccessContext, submissionId: string, pathname: string) {
  await enforceRateLimit(ctx, RATE_LIMITS.evidenceUpload, actor.userId);
  await uploaderFor(ctx, actor, submissionId);
  if (evidenceStore().kind === "none") throw new PracticalError("storage_off", "Uploads aren't available right now.");
  if (!pathname.startsWith(uploadPrefix(submissionId)) || pathname.includes("..")) {
    throw new PracticalError("invalid", "Upload path not allowed.");
  }
  if ((await evidenceCount(ctx, submissionId)) >= MAX_EVIDENCE_ITEMS) {
    throw new PracticalError("too_many", `You can add up to ${MAX_EVIDENCE_ITEMS} items.`);
  }
  return {
    allowedContentTypes: Object.keys(ALLOWED_TYPES),
    maximumSizeInBytes: MAX_FILE_BYTES,
    addRandomSuffix: true,
    validUntil: ctx.now().getTime() + 15 * 60 * 1000,
  };
}

/**
 * After the browser finishes a direct upload: verify the object (prefix,
 * size, type), compute its checksum, run the scan hook, then record it.
 * Rejected or infected files are deleted from storage.
 */
export async function confirmUpload(
  ctx: RateCtx,
  actor: AccessContext,
  submissionId: string,
  pathname: string,
  originalName: string,
): Promise<EvidenceView> {
  const { source } = await uploaderFor(ctx, actor, submissionId);
  const store = evidenceStore();
  if (!pathname.startsWith(uploadPrefix(submissionId)) || pathname.includes("..")) {
    throw new PracticalError("invalid", "Upload path not allowed.");
  }
  const obj = await store.head(pathname);
  if (!obj) throw new PracticalError("invalid", "The upload didn't finish. Please try again.");
  const fileName = cleanFileName(originalName);
  const reject = async (reason: string, message: string) => {
    await store.remove(pathname);
    await writeAudit(ctx, {
      action: "practical.evidence.rejected",
      actorId: actor.userId,
      entityType: "submission",
      entityId: submissionId,
      after: { reason },
    });
    throw new PracticalError("invalid", message);
  };
  const problem = fileProblem(fileName, obj.contentType, obj.size);
  if (problem) return reject("type_or_size", problem);
  if ((await evidenceCount(ctx, submissionId)) >= MAX_EVIDENCE_ITEMS) {
    return reject("too_many", `You can add up to ${MAX_EVIDENCE_ITEMS} items.`);
  }
  const bytes = await store.read(pathname);
  if (!bytes || bytes.byteLength !== obj.size) return reject("unreadable", "The upload didn't finish. Please try again.");
  const scan = await virusScanner().scan(bytes, { fileName, mimeType: obj.contentType });
  if (scan === "infected") return reject("infected", "That file failed the virus check and was removed.");
  const [row] = await ctx.db
    .insert(evidenceItems)
    .values({
      submissionId,
      kind: "file",
      source,
      addedBy: actor.userId,
      storagePathname: pathname,
      fileName,
      mimeType: obj.contentType,
      sizeBytes: obj.size,
      checksumSha256: sha256Hex(bytes),
      scanStatus: scan,
      scannedAt: scan === "not_scanned" ? null : ctx.now(),
    })
    .onConflictDoNothing()
    .returning();
  if (!row) throw new PracticalError("invalid", "That file was already added.");
  await writeAudit(ctx, {
    action: "practical.evidence.added",
    actorId: actor.userId,
    entityType: "submission",
    entityId: submissionId,
    after: { evidenceId: row.id, kind: "file", bytes: obj.size, scan },
  });
  return (await evidenceOf(ctx, submissionId)).find((e) => e.id === row.id)!;
}

export async function addLink(ctx: RateCtx, actor: AccessContext, submissionId: string, raw: string): Promise<void> {
  await enforceRateLimit(ctx, RATE_LIMITS.evidenceUpload, actor.userId);
  const { source } = await uploaderFor(ctx, actor, submissionId);
  const check = checkLink(raw);
  if (!check.ok) throw new PracticalError("invalid", check.problem);
  if ((await evidenceCount(ctx, submissionId)) >= MAX_EVIDENCE_ITEMS) {
    throw new PracticalError("too_many", `You can add up to ${MAX_EVIDENCE_ITEMS} items.`);
  }
  const [row] = await ctx.db
    .insert(evidenceItems)
    .values({ submissionId, kind: "link", source, addedBy: actor.userId, linkUrl: check.url, linkHost: check.host })
    .returning({ id: evidenceItems.id });
  await writeAudit(ctx, {
    action: "practical.evidence.added",
    actorId: actor.userId,
    entityType: "submission",
    entityId: submissionId,
    after: { evidenceId: row!.id, kind: "link", host: check.host },
  });
}

export async function removeEvidence(ctx: Ctx, actor: AccessContext, evidenceId: string): Promise<void> {
  const [item] = await ctx.db.select().from(evidenceItems).where(eq(evidenceItems.id, evidenceId));
  if (!item) throw new PracticalError("not_found", "Not found.");
  const { source } = await uploaderFor(ctx, actor, item.submissionId);
  if (item.source !== source || item.addedBy !== actor.userId) throw new PracticalError("not_found", "Not found.");
  await ctx.db.delete(evidenceItems).where(eq(evidenceItems.id, evidenceId));
  if (item.storagePathname) await evidenceStore().remove(item.storagePathname);
  await writeAudit(ctx, {
    action: "practical.evidence.removed",
    actorId: actor.userId,
    entityType: "submission",
    entityId: item.submissionId,
    after: { evidenceId, kind: item.kind },
  });
}

/** "Submit for assessment": locks the draft (needs at least one item; links confirmed viewable). */
export async function submitPractical(
  ctx: RateCtx,
  actor: AccessContext,
  submissionId: string,
  linksConfirmed: boolean,
): Promise<void> {
  await enforceRateLimit(ctx, RATE_LIMITS.practicalSubmit, actor.userId);
  const { submission, source } = await uploaderFor(ctx, actor, submissionId);
  if (source !== "learner") throw new PracticalError("not_found", "Submission not found.");
  const evidence = await evidenceOf(ctx, submissionId);
  if (evidence.length === 0) throw new PracticalError("invalid", "Add at least one file or link before submitting.");
  if (evidence.some((e) => e.kind === "link") && !linksConfirmed) {
    throw new PracticalError("invalid", "Confirm that your assessor can open your links.");
  }
  const updated = await ctx.db
    .update(submissions)
    .set({ status: "submitted", submittedAt: ctx.now(), linksConfirmed })
    .where(and(eq(submissions.id, submission.id), eq(submissions.status, "draft")))
    .returning({ id: submissions.id });
  if (updated.length === 0) return;
  await writeAudit(ctx, {
    action: "practical.submission.submitted",
    actorId: actor.userId,
    entityType: "submission",
    entityId: submissionId,
    after: { items: evidence.length, attemptNo: submission.attemptNo },
  });
}

// ---------------------------------------------------------------------------
// Opening evidence (signed links), results, appeals
// ---------------------------------------------------------------------------

/**
 * A short-lived URL to open one evidence item. The learner may open their
 * own; assessors, moderators and evaluators in scope may open any (audited).
 * Links return their stored URL.
 */
export async function evidenceUrl(ctx: RateCtx, actor: AccessContext, evidenceId: string): Promise<string> {
  await enforceRateLimit(ctx, RATE_LIMITS.evidenceView, actor.userId);
  const [row] = await ctx.db
    .select({ item: evidenceItems, userId: enrolments.userId, cohortId: enrolments.cohortId })
    .from(evidenceItems)
    .innerJoin(submissions, eq(submissions.id, evidenceItems.submissionId))
    .innerJoin(enrolments, eq(enrolments.id, submissions.enrolmentId))
    .where(eq(evidenceItems.id, evidenceId));
  if (!row) throw new PracticalError("not_found", "Not found.");
  const own = row.userId === actor.userId && row.item.source === "learner";
  const staffRoles = EVIDENCE_ROLES.filter((r) => actor.roles.has(r));
  const staff =
    staffRoles.length > 0 &&
    (actor.activePasskeys > 0 || staffRoles.includes("external_evaluator")) &&
    inScope(await cohortScope(ctx, actor, EVIDENCE_ROLES), row.cohortId);
  if (!own && !staff) throw new PracticalError("not_found", "Not found.");
  if (row.item.kind === "link") return row.item.linkUrl!;
  if (row.item.scanStatus === "infected" || (!own && !staffMayOpen(row.item.scanStatus))) {
    throw new PracticalError("invalid", "This file can't be opened until it passes the virus check.");
  }
  if (!own) {
    await writeAudit(ctx, {
      action: "practical.evidence.viewed",
      actorId: actor.userId,
      entityType: "evidence_item",
      entityId: evidenceId,
    });
  }
  return evidenceStore().signedGetUrl(row.item.storagePathname!, SIGNED_URL_TTL_MS);
}

/** Learner appeal against a released practical decision (7-day window). */
export async function submitPracticalAppeal(
  ctx: RateCtx,
  actor: AccessContext,
  submissionId: string,
  reason: string,
): Promise<void> {
  await enforceRateLimit(ctx, RATE_LIMITS.appealSubmit, actor.userId);
  const [row] = await ctx.db
    .select({ submission: submissions, userId: enrolments.userId })
    .from(submissions)
    .innerJoin(enrolments, eq(enrolments.id, submissions.enrolmentId))
    .where(eq(submissions.id, submissionId));
  if (!row || row.userId !== actor.userId) throw new PracticalError("not_found", "Not found.");
  const [h] = await historyOf(ctx, [row.submission]);
  if (!h?.result) throw new PracticalError("not_found", "There is no released result to appeal.");
  if (h.result.appeal.state !== "can_appeal") throw new PracticalError("appeal_closed", "This result can no longer be appealed.");
  const text = reason.trim();
  if (text.length < 1 || text.length > 4000) throw new PracticalError("invalid", "Tell us why you're appealing (up to 4000 characters).");
  const [a] = await ctx.db
    .insert(appeals)
    .values({ decisionId: h.result.decisionId, enrolmentId: row.submission.enrolmentId, reason: text })
    .onConflictDoNothing()
    .returning({ id: appeals.id });
  if (!a) return;
  await writeAudit(ctx, {
    action: "practical.appeal.submitted",
    actorId: actor.userId,
    entityType: "appeal",
    entityId: a.id,
    after: { decisionId: h.result.decisionId },
  });
}

/** Staff: start the observed submission for a learner on the day (used by the register). */
export async function startObservedSubmission(
  ctx: Ctx,
  assessorId: string,
  scheduleId: string,
  enrolmentId: string,
): Promise<string> {
  const { schedule, brief } = await loadSchedule(ctx, scheduleId);
  if (brief.mode !== "observed") throw new PracticalError("invalid", "This task isn't observed on the day.");
  const [e] = await ctx.db.select().from(enrolments).where(eq(enrolments.id, enrolmentId));
  if (!e || e.cohortId !== schedule.cohortId) throw new PracticalError("not_found", "Learner not found in this cohort.");
  const allowance = await practicalAllowance(ctx, enrolmentId, brief);
  if (!allowance.ok) {
    throw new PracticalError(allowance.reason, allowance.reason === "no_attempts_left" ? "No attempts left for this learner." : "The previous attempt hasn't been released yet.");
  }
  const s = await createSubmission(
    ctx,
    { enrolmentId, userId: e.userId, briefId: brief.id, attemptNo: allowance.attemptNo, scheduleId, observed: true },
    assessorId,
  );
  return s.id;
}

export async function latestSubmissionForSchedule(ctx: Db, scheduleId: string, enrolmentId: string) {
  const [s] = await ctx.db
    .select()
    .from(submissions)
    .where(and(eq(submissions.scheduleId, scheduleId), eq(submissions.enrolmentId, enrolmentId)))
    .orderBy(desc(submissions.attemptNo))
    .limit(1);
  return s ?? null;
}
