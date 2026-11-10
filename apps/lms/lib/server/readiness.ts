import { asc, eq, sql } from "drizzle-orm";
import { qualifications } from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import {
  FORM5_ITEMS,
  type Form5Section,
  type ItemStatus,
  MANUAL_ITEMS,
  backupItemStatus,
  documentStatus,
  statusCounts,
} from "@/lib/form5";
import { authorize } from "./auth";
import { backupStatus } from "./backup";
import type { ServerCtx } from "./context";
import { CommsError } from "./comms";
import { type DocumentRef, currentCurriculumReference, currentDocuments, currentGuide } from "./complianceDocs";
import { APP_NAME } from "./email";

/**
 * Form 5 readiness (design.md §14, 2026-11-09): one row per section 4 item
 * for a qualification, with a status computed from live data, the figures
 * behind it and links to the evidence. SDP admins edit references; external
 * evaluators see the same rows read-only. Cohort-based checks add up across
 * every cohort of the qualification.
 */

export const READINESS_ROLES = ["sdp_admin", "external_evaluator"] as const;
const VIEW: Requirement = { kind: "roles", anyOf: READINESS_ROLES, stepUp: false };

export type EvidenceLink = { label: string; href: string; adminOnly?: boolean };

export type ReadinessItem = {
  code: string;
  section: Form5Section;
  title: string;
  status: ItemStatus;
  /** Live figures, one short line each. */
  facts: string[];
  /** What is missing or wrong (drives "Needs attention"). */
  problems: string[];
  links: EvidenceLink[];
  document?: DocumentRef | null;
  manualLabel?: string;
};

type Ctx = ServerCtx;

export async function listQualifications(ctx: Ctx, actor: AccessContext | null) {
  await authorize(ctx, actor, VIEW, "readiness.qualifications");
  return ctx.db
    .select({ id: qualifications.id, title: qualifications.title, code: qualifications.curriculumCode, nqfLevel: qualifications.nqfLevel })
    .from(qualifications)
    .orderBy(asc(qualifications.title));
}

type Figures = {
  km: number;
  pm: number;
  km_sections: number;
  km_sections_without_text: string[] | null;
  sections_without_check: string[] | null;
  km_without_formative: string[] | null;
  formative_published: number;
  summative_published: number;
  short_sets: string[] | null;
  blueprint_schedules: number;
  formative_attempts: number;
  moderators: number;
  closed_batches_knowledge: number;
  moderation_records_knowledge: number;
  closed_batches_practical: number;
  moderation_records_practical: number;
  cohorts: number;
  active_learners: number;
  announcements: number;
  threads: number;
  conversations: number;
  library: number;
  sessions: number;
  recordings: number;
  attendance_marked: number;
  notes: number;
  note_recordings: number;
  tickets: number;
  overdue_tickets: number;
  pm_without_brief: string[] | null;
  briefs_published: number;
  briefs_without_criteria: string[] | null;
  observed_briefs: number;
  brief_schedules: number;
  practical_submissions: number;
};

async function figures(ctx: Ctx, q: string): Promise<Figures> {
  const now = ctx.now().toISOString();
  const [row] = await ctx.db.execute<Figures>(sql`
    with mods as (select id, code, type from modules where qualification_id = ${q}),
    secs as (select s.id, s.title, m.code, m.type from sections s join mods m on m.id = s.module_id),
    chs as (select id from cohorts where qualification_id = ${q}),
    bps as (select b.* from assessment_blueprints b join mods m on m.id = b.module_id),
    brs as (select b.* from practical_briefs b join mods m on m.id = b.module_id),
    decs as (
      select d.id, d.attempt_id, d.submission_id from assessment_decisions d
      join moderation_batches mb on mb.id = d.batch_id where mb.cohort_id in (select id from chs)
    )
    select
      (select count(*)::int from mods where type = 'knowledge') as km,
      (select count(*)::int from mods where type = 'practical') as pm,
      (select count(*)::int from secs where type = 'knowledge') as km_sections,
      (select json_agg(code || ': ' || title) from secs where type = 'knowledge' and not exists (
        select 1 from content_items ci where ci.section_id = secs.id and ci.kind = 'text' and ci.status = 'published')) as km_sections_without_text,
      (select json_agg(code || ': ' || title) from secs where type = 'knowledge' and not exists (
        select 1 from section_question_pools p
        join section_pool_questions pq on pq.pool_id = p.id
        join questions qu on qu.id = pq.question_id
        join question_versions v on v.id = qu.current_version_id
        where p.section_id = secs.id and qu.status = 'active' and v.type = 'single')) as sections_without_check,
      (select json_agg(m.code) from mods m where m.type = 'knowledge' and not exists (
        select 1 from bps where bps.module_id = m.id and bps.kind = 'formative' and bps.status = 'published')) as km_without_formative,
      (select count(*)::int from bps where kind = 'formative' and status = 'published') as formative_published,
      (select count(*)::int from bps where kind = 'summative' and status = 'published') as summative_published,
      (select json_agg(distinct bps.title || ': "' || qb.title || '" has ' || coalesce(act.n, 0) || ' of ' || r.question_count)
         from bps join blueprint_rules r on r.blueprint_id = bps.id
         join question_banks qb on qb.id = r.bank_id
         left join (select bank_id, count(*)::int as n from questions where status = 'active' and current_version_id is not null group by bank_id) act on act.bank_id = r.bank_id
         where bps.status = 'published' and bps.kind in ('formative', 'summative') and coalesce(act.n, 0) < r.question_count) as short_sets,
      (select count(*)::int from assessment_schedules s where s.cohort_id in (select id from chs) and s.blueprint_id is not null) as blueprint_schedules,
      (select count(*)::int from assessment_attempts a join bps on bps.id = a.blueprint_id
         where bps.kind = 'formative' and a.status in ('submitted', 'graded')) as formative_attempts,
      (select count(*)::int from role_grants g where g.role = 'moderator' and (g.cohort_id in (select id from chs) or g.cohort_id is null)
         and (g.expires_at is null or g.expires_at > ${now}::timestamptz)) as moderators,
      (select count(*)::int from moderation_batches mb where mb.cohort_id in (select id from chs) and mb.status = 'closed' and mb.blueprint_id is not null) as closed_batches_knowledge,
      (select count(*)::int from moderation_records mr join decs on decs.id = mr.decision_id where decs.attempt_id is not null) as moderation_records_knowledge,
      (select count(*)::int from moderation_batches mb where mb.cohort_id in (select id from chs) and mb.status = 'closed' and mb.brief_id is not null) as closed_batches_practical,
      (select count(*)::int from moderation_records mr join decs on decs.id = mr.decision_id where decs.submission_id is not null) as moderation_records_practical,
      (select count(*)::int from chs) as cohorts,
      (select count(*)::int from enrolments e where e.cohort_id in (select id from chs) and e.status = 'active') as active_learners,
      (select count(*)::int from announcements a where a.cohort_id in (select id from chs) and a.published_at is not null) as announcements,
      (select count(*)::int from discussion_threads t where t.cohort_id in (select id from chs)) as threads,
      (select count(*)::int from conversations c where c.cohort_id in (select id from chs)) as conversations,
      (select count(*)::int from library_resources l where l.qualification_id = ${q} and l.published) as library,
      (select count(*)::int from live_sessions ls where ls.cohort_id in (select id from chs) and ls.cancelled_at is null) as sessions,
      (select count(*)::int from live_sessions ls where ls.cohort_id in (select id from chs) and ls.recording_url is not null) as recordings,
      (select count(*)::int from session_attendance sa join live_sessions ls on ls.id = sa.session_id where ls.cohort_id in (select id from chs)) as attendance_marked,
      (select count(*)::int from section_notes n where n.cohort_id in (select id from chs) and n.archived_at is null) as notes,
      (select count(*)::int from section_notes n where n.cohort_id in (select id from chs) and n.archived_at is null and n.recording_url is not null) as note_recordings,
      (select count(*)::int from support_tickets t where t.cohort_id in (select id from chs)) as tickets,
      (select count(*)::int from support_tickets t where t.cohort_id in (select id from chs) and t.status in ('open', 'in_progress')
         and ((t.first_responded_at is null and t.first_response_due_at < ${now}::timestamptz) or t.resolve_due_at < ${now}::timestamptz)) as overdue_tickets,
      (select json_agg(m.code) from mods m where m.type = 'practical' and not exists (
         select 1 from brs where brs.module_id = m.id and brs.status = 'published')) as pm_without_brief,
      (select count(*)::int from brs where status = 'published') as briefs_published,
      (select json_agg(brs.title) from brs where brs.status = 'published' and not exists (select 1 from brief_criteria c where c.brief_id = brs.id)) as briefs_without_criteria,
      (select count(*)::int from brs where status = 'published' and mode = 'observed') as observed_briefs,
      (select count(*)::int from assessment_schedules s where s.cohort_id in (select id from chs) and s.brief_id is not null) as brief_schedules,
      (select count(*)::int from submissions s join enrolments e on e.id = s.enrolment_id where e.cohort_id in (select id from chs) and s.status = 'submitted') as practical_submissions
  `);
  return row!;
}

const n = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
const list = (xs: string[] | null, max = 5) =>
  !xs?.length ? "" : xs.length <= max ? xs.join("; ") : `${xs.slice(0, max).join("; ")} and ${xs.length - max} more`;

/** The full dashboard for one qualification. */
export async function readiness(ctx: Ctx, actor: AccessContext | null, qualificationId: string) {
  const a = await authorize(ctx, actor, VIEW, "readiness.view");
  const [qual] = await ctx.db
    .select({ id: qualifications.id, title: qualifications.title, code: qualifications.curriculumCode, nqfLevel: qualifications.nqfLevel })
    .from(qualifications)
    .where(eq(qualifications.id, qualificationId));
  if (!qual) throw new CommsError("not_found", "Qualification not found.");
  const now = ctx.now();
  const [f, docs, backups, guide, curriculumRef] = await Promise.all([
    figures(ctx, qualificationId),
    currentDocuments(ctx),
    backupStatus(ctx),
    currentGuide(ctx, qualificationId),
    currentCurriculumReference(ctx, qualificationId),
  ]);
  const evidence = "/staff/evidence/form5";
  const guideLink: EvidenceLink[] = guide ? [{ label: "Learner guide (PDF)", href: `${evidence}/guide/${qualificationId}` }] : [];
  const commsLog: EvidenceLink = { label: "Communication log", href: "/staff/evidence/communication" };
  const pack: EvidenceLink = { label: "Evidence pack", href: `${evidence}/pack?qualification=${qualificationId}` };

  const build = (code: string): Omit<ReadinessItem, "code" | "section" | "title"> => {
    const st = (problems: string[]): ItemStatus => (problems.length ? "attention" : "ready");
    if (code in MANUAL_ITEMS) {
      const doc = docs.get(code) ?? null;
      const ds = documentStatus(doc, now);
      const facts: string[] = [];
      if (code === "4.1.3") facts.push(`${APP_NAME} is self-built (no vendor licence)`, `${n(f.active_learners, "active learner")} in ${n(f.cohorts, "cohort")}`);
      if (code === "4.1.4") facts.push("Autosave per answer, resume after a dropped connection, text-first content, media never autoplays");
      if (code === "4.2.9") facts.push("Platform: Zoom (live sessions store Zoom links only)");
      return { status: ds.status, facts, problems: ds.note ? [ds.note] : [], links: [], document: doc, manualLabel: MANUAL_ITEMS[code] };
    }
    switch (code) {
      case "4.1.2":
        return { status: "ready", facts: [`${APP_NAME} (self-built LMS, Next.js and Postgres)`], problems: [], links: [] };
      case "4.1.6": {
        const b = backupItemStatus(backups.lastBackup, backups.lastRestoreTest, now);
        const facts = [
          `Nightly encrypted backup to private storage, last 7 kept`,
          `Last backup: ${backups.lastBackup ? backups.lastBackup.toISOString().slice(0, 10) : "none"}`,
          `Last restore test: ${backups.lastRestoreTest ? backups.lastRestoreTest.toISOString().slice(0, 10) : "none"}`,
          "ID numbers, equity and disability data encrypted in the application (AES-256-GCM)",
        ];
        if (backups.lastFailure && (!backups.lastBackup || backups.lastFailure.at > backups.lastBackup))
          b.problems.push(`Last backup failed: ${backups.lastFailure.notes}`);
        return { status: st(b.problems), facts, problems: b.problems, links: [{ label: "Backup and restore log", href: `${evidence}?qualification=${qualificationId}#backups` }] };
      }
      case "4.2.1": {
        const p: string[] = [];
        if (f.km === 0) p.push("No knowledge modules loaded");
        if (f.km_sections_without_text?.length) p.push(`Sections without published text: ${list(f.km_sections_without_text)}`);
        return {
          status: st(p),
          facts: [`${n(f.km, "knowledge module")}, ${n(f.km_sections, "section")}; each section: text, optional audio/video, one check question`],
          problems: p,
          links: [{ label: "Programme structure", href: "/admin/assessments/coverage", adminOnly: true }],
        };
      }
      case "4.2.2":
      case "4.3.2": {
        const p = guide ? [] : ["Upload the learner guide for this qualification"];
        const facts = guide
          ? [`Learner guide "${guide.title}" v${guide.version}, issued ${guide.issuedOn} (covers every curriculum topic)`]
          : [];
        if (code === "4.3.2") facts.push(`${n(f.briefs_published, "published practical brief")}`);
        return { status: st(p), facts, problems: p, links: guideLink };
      }
      case "4.2.3": {
        const p: string[] = [];
        if (f.sections_without_check?.length) p.push(`Lessons without a check question: ${list(f.sections_without_check)}`);
        if (f.km_without_formative?.length) p.push(`Knowledge modules without a published formative: ${list(f.km_without_formative)}`);
        if (f.short_sets?.length) p.push(`Question sets smaller than the test draws: ${list(f.short_sets)}`);
        if (f.pm_without_brief?.length) p.push(`Practical modules without a published brief: ${list(f.pm_without_brief)}`);
        return {
          status: st(p),
          facts: [`${n(f.formative_published, "published formative")}, ${n(f.summative_published, "published summative")}`, `${n(f.briefs_published, "practical brief")}`, "Workplace: not applicable (4.4)"],
          problems: p,
          links: [{ label: "Blueprints", href: "/admin/assessments", adminOnly: true }, { label: "Practical briefs", href: "/admin/practical", adminOnly: true }],
        };
      }
      case "4.2.4": {
        const p = f.blueprint_schedules ? [] : ["No assessment scheduled for any cohort yet"];
        return {
          status: st(p),
          facts: [`${n(f.blueprint_schedules, "scheduled assessment window")}`, `${n(f.formative_attempts, "submitted formative attempt")}`, "Seeded random papers, server-side grading"],
          problems: p,
          links: [pack],
        };
      }
      case "4.2.5":
      case "4.3.5": {
        const knowledge = code === "4.2.5";
        const closed = knowledge ? f.closed_batches_knowledge : f.closed_batches_practical;
        const records = knowledge ? f.moderation_records_knowledge : f.moderation_records_practical;
        const p: string[] = [];
        if (f.moderators === 0) p.push("No moderator assigned to a cohort of this qualification");
        if (records === 0) p.push("No moderation records yet");
        return {
          status: st(p),
          facts: [`${n(f.moderators, "moderator grant")}`, `${n(closed, "closed moderation batch", "closed moderation batches")}`, `${n(records, "moderation record")}`],
          problems: p,
          links: [pack],
        };
      }
      case "4.2.6": {
        const p = f.announcements + f.threads + f.conversations === 0 ? ["No announcements, discussions or messages yet"] : [];
        return {
          status: st(p),
          facts: [`${n(f.announcements, "announcement")}, ${n(f.threads, "discussion thread")}, ${n(f.conversations, "private conversation")}`],
          problems: p,
          links: [commsLog],
        };
      }
      case "4.2.7": {
        const p = f.library ? [] : ["No published library resources"];
        return { status: st(p), facts: [`${n(f.library, "published library resource")}`], problems: p, links: [{ label: "Library", href: "/library", adminOnly: true }] };
      }
      case "4.2.8": {
        const p = f.sessions ? [] : ["No live sessions scheduled yet"];
        return {
          status: st(p),
          facts: [`Zoom · ${n(f.sessions, "live session")}, ${n(f.recordings, "recording")}, ${n(f.attendance_marked, "attendance record")}`],
          problems: p,
          links: [commsLog],
        };
      }
      case "4.2.10": {
        const p = f.notes ? [] : ["No facilitator notes posted yet"];
        return { status: st(p), facts: [`${n(f.notes, "section note")}, ${n(f.note_recordings, "with a recording link", "with recording links")}`], problems: p, links: [commsLog] };
      }
      case "4.2.11": {
        const p = f.overdue_tickets ? [`${n(f.overdue_tickets, "support ticket")} past the response target`] : [];
        return {
          status: st(p),
          facts: [`${n(f.tickets, "support ticket")}; first reply within 1 working day, resolved within 5`, "At-risk flags, discussions, messages, check and assessor feedback"],
          problems: p,
          links: [commsLog, { label: "Support tickets", href: "/staff/tickets?filter=all", adminOnly: true }],
        };
      }
      case "4.3.1": {
        const p: string[] = [];
        if (f.pm === 0) p.push("No practical modules loaded");
        if (f.pm_without_brief?.length) p.push(`Practical modules without a published brief: ${list(f.pm_without_brief)}`);
        return { status: st(p), facts: [`${n(f.pm, "practical module")}, ${n(f.briefs_published, "published brief")} (assigned variant per learner)`], problems: p, links: [{ label: "Practical briefs", href: "/admin/practical", adminOnly: true }] };
      }
      case "4.3.3": {
        const p: string[] = [];
        if (f.pm_without_brief?.length) p.push(`Practical modules without a published brief: ${list(f.pm_without_brief)}`);
        if (f.briefs_without_criteria?.length) p.push(`Briefs without criteria: ${list(f.briefs_without_criteria)}`);
        return { status: st(p), facts: [`${n(f.briefs_published, "published brief")} with Met / Not yet met criteria`], problems: p, links: [{ label: "Practical briefs", href: "/admin/practical", adminOnly: true }] };
      }
      case "4.3.4": {
        const p = f.brief_schedules ? [] : ["No practical task scheduled for any cohort yet"];
        return {
          status: st(p),
          facts: [`${n(f.brief_schedules, "scheduled practical task")} (${f.observed_briefs} observed on the day)`, `${n(f.practical_submissions, "submitted piece of work", "submitted pieces of work")}`],
          problems: p,
          links: [pack],
        };
      }
      case "4.4.1":
      case "4.4.2":
      case "4.4.3": {
        if (!curriculumRef) return { status: "attention", facts: ["Not applicable: no workplace module"], problems: ["Record the curriculum document reference that confirms this"], links: [] };
        return {
          status: "na",
          facts: [
            "Not applicable: no workplace module",
            `${curriculumRef.documentTitle}, ${curriculumRef.curriculumCode} v${curriculumRef.version}, ${curriculumRef.location}${curriculumRef.note ? ` (${curriculumRef.note})` : ""}`,
            `Recorded by ${curriculumRef.recordedBy}, ${curriculumRef.createdAt.toISOString().slice(0, 10)}`,
          ],
          problems: [],
          links: [],
        };
      }
      default:
        return { status: "attention", facts: [], problems: ["Not tracked"], links: [] };
    }
  };

  const isEvaluator = !a.roles.has("sdp_admin");
  const items: ReadinessItem[] = FORM5_ITEMS.map((it) => {
    const b = build(it.code);
    return { ...it, ...b, links: isEvaluator ? b.links.filter((l) => !l.adminOnly) : b.links };
  });
  const manualStillNeeded = items.filter((i) => i.manualLabel && i.status === "manual").map((i) => ({ code: i.code, label: i.manualLabel! }));
  return {
    qualification: qual,
    items,
    counts: statusCounts(items),
    manualStillNeeded,
    guide,
    curriculumRef,
    canEdit: a.roles.has("sdp_admin"),
    generatedAt: now,
  };
}

export type Readiness = Awaited<ReturnType<typeof readiness>>;
