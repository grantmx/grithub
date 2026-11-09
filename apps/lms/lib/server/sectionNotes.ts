import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { cohorts, modules, sectionNotes, sections, users } from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import { checkRecordingLink } from "@/lib/comms";
import { writeAudit } from "./audit";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";
import { CommsError, learnerCohorts, requireText } from "./comms";
import { assertCohortScope } from "./staffScope";

/**
 * Facilitator notes and recording links per section (design.md §14,
 * 2026-11-08; Form 5 4.2.10). A note belongs to one cohort and shows on the
 * section page after the lesson text, before the check. Recordings are
 * links only (Zoom cloud or the evidence allow-list); no transcript needed.
 */

export const NOTE_ROLES = ["facilitator", "sdp_admin"] as const;
const STAFF: Requirement = { kind: "roles", anyOf: NOTE_ROLES, stepUp: false };
const USER: Requirement = { kind: "user" };

type Ctx = ServerCtx;

async function sectionInCohort(ctx: Ctx, cohortId: string, sectionId: string) {
  const [row] = await ctx.db
    .select({ id: sections.id })
    .from(sections)
    .innerJoin(modules, eq(modules.id, sections.moduleId))
    .innerJoin(cohorts, eq(cohorts.qualificationId, modules.qualificationId))
    .where(and(eq(sections.id, sectionId), eq(cohorts.id, cohortId)));
  if (!row) throw new CommsError("not_found", "That section isn't part of this cohort's programme.");
}

/** The cohort's programme outline with each section's notes (staff page). */
export async function listCohortNotes(ctx: Ctx, actor: AccessContext | null, cohortId: string) {
  const a = await authorize(ctx, actor, STAFF, "notes.list");
  await assertCohortScope(ctx, a, NOTE_ROLES, cohortId, "notes.list");
  const outline = await ctx.db
    .select({
      moduleId: modules.id,
      moduleCode: modules.code,
      moduleTitle: modules.title,
      sectionId: sections.id,
      sectionTitle: sections.title,
    })
    .from(sections)
    .innerJoin(modules, eq(modules.id, sections.moduleId))
    .innerJoin(cohorts, eq(cohorts.qualificationId, modules.qualificationId))
    .where(eq(cohorts.id, cohortId))
    .orderBy(asc(modules.code), asc(sections.sortOrder));
  const notes = await ctx.db
    .select({
      id: sectionNotes.id,
      sectionId: sectionNotes.sectionId,
      body: sectionNotes.body,
      recordingUrl: sectionNotes.recordingUrl,
      recordingLabel: sectionNotes.recordingLabel,
      author: users.displayName,
      createdAt: sectionNotes.createdAt,
    })
    .from(sectionNotes)
    .innerJoin(users, eq(users.id, sectionNotes.authorId))
    .where(and(eq(sectionNotes.cohortId, cohortId), isNull(sectionNotes.archivedAt)))
    .orderBy(asc(sectionNotes.createdAt));
  return outline.map((s) => ({ ...s, notes: notes.filter((n) => n.sectionId === s.sectionId) }));
}

export async function addSectionNote(
  ctx: Ctx,
  actor: AccessContext | null,
  input: { cohortId: string; sectionId: string; body: string; recordingUrl: string; recordingLabel: string },
): Promise<string> {
  const a = await authorize(ctx, actor, STAFF, "notes.add");
  await assertCohortScope(ctx, a, NOTE_ROLES, input.cohortId, "notes.add");
  await sectionInCohort(ctx, input.cohortId, input.sectionId);
  const rawUrl = input.recordingUrl.trim();
  let recordingUrl: string | null = null;
  let recordingLabel: string | null = null;
  if (rawUrl) {
    const link = checkRecordingLink(rawUrl);
    if (!link.ok) throw new CommsError("invalid", link.problem);
    recordingUrl = link.url;
    recordingLabel = input.recordingLabel.trim().slice(0, 120) || `Recording (${link.label})`;
  }
  const body = input.body.trim() ? requireText(input.body, { label: "The note" }) : "";
  if (!body && !recordingUrl) throw new CommsError("invalid", "Write a note or add a recording link.");
  const [row] = await ctx.db
    .insert(sectionNotes)
    .values({ cohortId: input.cohortId, sectionId: input.sectionId, authorId: a.userId, body, recordingUrl, recordingLabel })
    .returning({ id: sectionNotes.id });
  await writeAudit(ctx, {
    action: "support.note.created",
    actorId: a.userId,
    entityType: "section_note",
    entityId: row!.id,
    after: { cohortId: input.cohortId, sectionId: input.sectionId, recording: Boolean(recordingUrl) },
  });
  return row!.id;
}

export async function archiveSectionNote(ctx: Ctx, actor: AccessContext | null, noteId: string) {
  const a = await authorize(ctx, actor, STAFF, "notes.archive");
  const [n] = await ctx.db.select({ cohortId: sectionNotes.cohortId }).from(sectionNotes).where(eq(sectionNotes.id, noteId));
  if (!n) throw new CommsError("not_found", "Note not found.");
  await assertCohortScope(ctx, a, NOTE_ROLES, n.cohortId, "notes.archive");
  await ctx.db.update(sectionNotes).set({ archivedAt: ctx.now() }).where(eq(sectionNotes.id, noteId));
  await writeAudit(ctx, { action: "support.note.archived", actorId: a.userId, entityType: "section_note", entityId: noteId });
}

/** Notes for the learner's own cohort on a section (section page). */
export async function notesForSection(ctx: Ctx, actor: AccessContext | null, sectionId: string) {
  const a = await authorize(ctx, actor, USER, "notes.section");
  const [sec] = await ctx.db
    .select({ qualificationId: modules.qualificationId })
    .from(sections)
    .innerJoin(modules, eq(modules.id, sections.moduleId))
    .where(eq(sections.id, sectionId));
  const cohort = sec ? (await learnerCohorts(ctx, a.userId)).find((c) => c.qualificationId === sec.qualificationId) : undefined;
  if (!cohort) return [];
  return ctx.db
    .select({
      id: sectionNotes.id,
      body: sectionNotes.body,
      recordingUrl: sectionNotes.recordingUrl,
      recordingLabel: sectionNotes.recordingLabel,
      author: users.displayName,
      createdAt: sectionNotes.createdAt,
    })
    .from(sectionNotes)
    .innerJoin(users, eq(users.id, sectionNotes.authorId))
    .where(and(eq(sectionNotes.cohortId, cohort.cohortId), eq(sectionNotes.sectionId, sectionId), isNull(sectionNotes.archivedAt)))
    .orderBy(desc(sectionNotes.createdAt));
}
