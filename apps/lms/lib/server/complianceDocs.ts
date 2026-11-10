import { and, desc, eq, isNull } from "drizzle-orm";
import { complianceDocuments, curriculumReferences, learnerGuides, qualifications, users } from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import { MANUAL_ITEMS } from "@/lib/form5";
import { writeAudit } from "./audit";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";
import { sha256Hex } from "./crypto";
import { CommsError } from "./comms";
import { SIGNED_URL_TTL_MS, evidenceStore } from "./evidenceStore";
import { RATE_LIMITS, enforceRateLimit } from "./ratelimit";

/**
 * Form 5 evidence held outside the LMS (design.md §14, 2026-11-09):
 * references to licences and contracts, the curriculum reference confirming
 * there is no workplace module (4.4), and the learner guide PDF per
 * qualification (the one uploaded file; private, access-checked, audited).
 * Recording a new reference archives the previous one.
 */

const ADMIN: Requirement = { kind: "roles", anyOf: ["sdp_admin"], stepUp: true };
const VIEW: Requirement = { kind: "roles", anyOf: ["sdp_admin", "external_evaluator"], stepUp: false };

export const GUIDE_MAX_BYTES = 50 * 1024 * 1024;
export const guidePrefix = (qualificationId: string) => `guides/${qualificationId}/`;

type Ctx = ServerCtx;
const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const isoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime());

// --- Manual documents (references only) ------------------------------------

export async function recordDocument(
  ctx: Ctx,
  actor: AccessContext | null,
  input: { itemCode: string; title: string; issuer: string; location: string; validUntil: string; notes: string },
): Promise<void> {
  const a = await authorize(ctx, actor, ADMIN, "compliance.recordDocument");
  if (!(input.itemCode in MANUAL_ITEMS)) throw new CommsError("invalid", "That item doesn't take a document reference.");
  const title = clip(input.title, 200);
  const location = clip(input.location, 300);
  if (!title) throw new CommsError("invalid", "Give the document a title.");
  if (!location) throw new CommsError("invalid", "Say where the document is kept.");
  const validUntil = clip(input.validUntil, 10) || null;
  if (validUntil && !isoDate(validUntil)) throw new CommsError("invalid", "Valid-until must be a date.");
  await ctx.db.transaction(async (tx) => {
    await tx
      .update(complianceDocuments)
      .set({ archivedAt: ctx.now() })
      .where(and(eq(complianceDocuments.itemCode, input.itemCode), isNull(complianceDocuments.archivedAt)));
    await tx.insert(complianceDocuments).values({
      itemCode: input.itemCode,
      title,
      issuer: clip(input.issuer, 200),
      location,
      validUntil,
      notes: clip(input.notes, 2000),
      recordedBy: a.userId,
    });
  });
  await writeAudit(ctx, {
    action: "compliance.document.recorded",
    actorId: a.userId,
    entityType: "compliance_document",
    after: { itemCode: input.itemCode, hasExpiry: Boolean(validUntil) },
  });
}

export type DocumentRef = {
  itemCode: string;
  title: string;
  issuer: string;
  location: string;
  validUntil: string | null;
  notes: string;
  recordedBy: string;
  createdAt: Date;
};

export async function currentDocuments(ctx: Pick<ServerCtx, "db">): Promise<Map<string, DocumentRef>> {
  const rows = await ctx.db
    .select({
      itemCode: complianceDocuments.itemCode,
      title: complianceDocuments.title,
      issuer: complianceDocuments.issuer,
      location: complianceDocuments.location,
      validUntil: complianceDocuments.validUntil,
      notes: complianceDocuments.notes,
      recordedBy: users.displayName,
      createdAt: complianceDocuments.createdAt,
    })
    .from(complianceDocuments)
    .innerJoin(users, eq(users.id, complianceDocuments.recordedBy))
    .where(isNull(complianceDocuments.archivedAt));
  return new Map(rows.map((r) => [r.itemCode, r]));
}

// --- Curriculum reference (4.4) ------------------------------------------------

export async function recordCurriculumReference(
  ctx: Ctx,
  actor: AccessContext | null,
  input: { qualificationId: string; documentTitle: string; curriculumCode: string; version: string; location: string; note: string },
): Promise<void> {
  const a = await authorize(ctx, actor, ADMIN, "compliance.curriculumReference");
  const [q] = await ctx.db.select({ id: qualifications.id }).from(qualifications).where(eq(qualifications.id, input.qualificationId));
  if (!q) throw new CommsError("not_found", "Qualification not found.");
  const v = {
    documentTitle: clip(input.documentTitle, 200),
    curriculumCode: clip(input.curriculumCode, 60),
    version: clip(input.version, 40),
    location: clip(input.location, 200),
    note: clip(input.note, 1000),
  };
  if (!v.documentTitle || !v.curriculumCode || !v.version || !v.location)
    throw new CommsError("invalid", "Fill in the document title, curriculum code, version and page or section.");
  await ctx.db.transaction(async (tx) => {
    await tx
      .update(curriculumReferences)
      .set({ archivedAt: ctx.now() })
      .where(and(eq(curriculumReferences.qualificationId, input.qualificationId), isNull(curriculumReferences.archivedAt)));
    await tx.insert(curriculumReferences).values({ qualificationId: input.qualificationId, ...v, recordedBy: a.userId });
  });
  await writeAudit(ctx, {
    action: "compliance.curriculum_reference.recorded",
    actorId: a.userId,
    entityType: "qualification",
    entityId: input.qualificationId,
  });
}

export async function currentCurriculumReference(ctx: Pick<ServerCtx, "db">, qualificationId: string) {
  const [row] = await ctx.db
    .select({
      documentTitle: curriculumReferences.documentTitle,
      curriculumCode: curriculumReferences.curriculumCode,
      version: curriculumReferences.version,
      location: curriculumReferences.location,
      note: curriculumReferences.note,
      recordedBy: users.displayName,
      createdAt: curriculumReferences.createdAt,
    })
    .from(curriculumReferences)
    .innerJoin(users, eq(users.id, curriculumReferences.recordedBy))
    .where(and(eq(curriculumReferences.qualificationId, qualificationId), isNull(curriculumReferences.archivedAt)));
  return row ?? null;
}

// --- Learner guide (uploaded PDF) -------------------------------------------------

/** Constraints for a direct client upload of a learner guide (Vercel Blob handleUpload). */
export async function guideUploadPolicy(ctx: Ctx, actor: AccessContext | null, qualificationId: string, pathname: string) {
  const a = await authorize(ctx, actor, ADMIN, "compliance.guideUpload");
  await enforceRateLimit(ctx, RATE_LIMITS.evidenceUpload, a.userId);
  if (evidenceStore().kind === "none") throw new CommsError("invalid", "Uploads aren't available right now.");
  const [q] = await ctx.db.select({ id: qualifications.id }).from(qualifications).where(eq(qualifications.id, qualificationId));
  if (!q) throw new CommsError("not_found", "Qualification not found.");
  if (!pathname.startsWith(guidePrefix(qualificationId)) || pathname.includes("..")) throw new CommsError("invalid", "Upload path not allowed.");
  return {
    allowedContentTypes: ["application/pdf"],
    maximumSizeInBytes: GUIDE_MAX_BYTES,
    addRandomSuffix: true,
    validUntil: ctx.now().getTime() + 15 * 60 * 1000,
  };
}

/** After the direct upload: verify (PDF, size, magic bytes), checksum, and make it the current guide. */
export async function confirmGuideUpload(
  ctx: Ctx,
  actor: AccessContext | null,
  input: { qualificationId: string; pathname: string; title: string; version: string; issuedOn: string },
): Promise<void> {
  const a = await authorize(ctx, actor, ADMIN, "compliance.guideConfirm");
  const store = evidenceStore();
  if (!input.pathname.startsWith(guidePrefix(input.qualificationId)) || input.pathname.includes(".."))
    throw new CommsError("invalid", "Upload path not allowed.");
  const reject = async (reason: string, message: string) => {
    await store.remove(input.pathname);
    await writeAudit(ctx, { action: "compliance.guide.rejected", actorId: a.userId, entityType: "qualification", entityId: input.qualificationId, after: { reason } });
    throw new CommsError("invalid", message);
  };
  const title = clip(input.title, 200);
  const version = clip(input.version, 40);
  if (!title || !version || !isoDate(input.issuedOn)) return reject("details", "Give the guide a title, version and issue date.");
  const obj = await store.head(input.pathname);
  if (!obj) throw new CommsError("invalid", "The upload didn't finish. Please try again.");
  if (obj.contentType !== "application/pdf" || obj.size > GUIDE_MAX_BYTES || obj.size === 0)
    return reject("type_or_size", "The learner guide must be a PDF of up to 50 MB.");
  const bytes = await store.read(input.pathname);
  if (!bytes || new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") return reject("not_pdf", "That file isn't a PDF.");
  await ctx.db.transaction(async (tx) => {
    await tx
      .update(learnerGuides)
      .set({ archivedAt: ctx.now() })
      .where(and(eq(learnerGuides.qualificationId, input.qualificationId), isNull(learnerGuides.archivedAt)));
    await tx.insert(learnerGuides).values({
      qualificationId: input.qualificationId,
      title,
      version,
      issuedOn: input.issuedOn,
      storagePathname: input.pathname,
      sizeBytes: bytes.byteLength,
      sha256: sha256Hex(bytes),
      uploadedBy: a.userId,
    });
  });
  await writeAudit(ctx, {
    action: "compliance.guide.uploaded",
    actorId: a.userId,
    entityType: "qualification",
    entityId: input.qualificationId,
    after: { bytes: bytes.byteLength, sha256: sha256Hex(bytes) },
  });
}

export async function currentGuide(ctx: Pick<ServerCtx, "db">, qualificationId: string) {
  const [row] = await ctx.db
    .select({
      id: learnerGuides.id,
      title: learnerGuides.title,
      version: learnerGuides.version,
      issuedOn: learnerGuides.issuedOn,
      sizeBytes: learnerGuides.sizeBytes,
      sha256: learnerGuides.sha256,
      storagePathname: learnerGuides.storagePathname,
      uploadedBy: users.displayName,
      createdAt: learnerGuides.createdAt,
    })
    .from(learnerGuides)
    .innerJoin(users, eq(users.id, learnerGuides.uploadedBy))
    .where(and(eq(learnerGuides.qualificationId, qualificationId), isNull(learnerGuides.archivedAt)))
    .orderBy(desc(learnerGuides.createdAt))
    .limit(1);
  return row ?? null;
}

/** A 5-minute signed link to the current guide, for SDP admins and evaluators; every view is audited. */
export async function guideUrl(ctx: Ctx, actor: AccessContext | null, qualificationId: string): Promise<string> {
  const a = await authorize(ctx, actor, VIEW, "compliance.guideView");
  await enforceRateLimit(ctx, RATE_LIMITS.evidenceView, a.userId);
  const g = await currentGuide(ctx, qualificationId);
  if (!g) throw new CommsError("not_found", "No learner guide has been uploaded for this qualification.");
  await writeAudit(ctx, { action: "compliance.guide.viewed", actorId: a.userId, entityType: "learner_guide", entityId: g.id });
  return evidenceStore().signedGetUrl(g.storagePathname, SIGNED_URL_TTL_MS);
}
