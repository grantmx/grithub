import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { curriculumReferenceAction, recordDocumentAction, restoreTestAction } from "@/app/admin/form5-actions";
import { SAST, StatusBanner } from "@/components/comms/staff/Shared";
import { GuideUploader } from "@/components/form5/GuideUploader";
import { BackupsSection, ManualStillNeeded, PackForm, QualificationPicker, ReadinessView, SummaryBar } from "@/components/form5/ReadinessView";
import styles from "@/components/form5/form5.module.css";
import ui from "@/components/ui.module.css";
import type { Form5Section } from "@/lib/form5";
import { backupLog } from "@/lib/server/backup";
import { CommsError } from "@/lib/server/comms";
import { packSamples } from "@/lib/server/evidencePack";
import { requirePage } from "@/lib/server/page";
import { panelSummaryLine, qctoPanel } from "@/lib/server/qctoPanel";
import { type ReadinessItem, listQualifications, readiness } from "@/lib/server/readiness";

export const metadata: Metadata = { title: "Form 5 readiness" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeZone: SAST });

// TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
const DONE: Record<string, string> = {
  document: "Document reference saved. Any earlier reference for that item was archived.",
  curriculum: "Curriculum reference saved.",
  restore: "Restore test logged.",
};

/** Admin → Form 5 readiness (design.md §14, 2026-11-09). */
export default async function Form5Page({
  searchParams,
}: {
  searchParams: Promise<{ qualification?: string; done?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const { ctx, actor } = await requirePage("/admin/form5");
  const quals = await listQualifications(ctx, actor);
  if (quals.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={ui.h1}>Form 5 readiness</h1>
        <p className={ui.muted}>No qualifications are loaded yet.</p>
      </div>
    );
  }
  const qualificationId = quals.find((q) => q.id === sp.qualification)?.id ?? quals[0]!.id;
  let r;
  try {
    r = await readiness(ctx, actor, qualificationId);
  } catch (e) {
    if (e instanceof CommsError && e.code === "not_found") notFound();
    throw e;
  }
  const [panel, samples, log] = await Promise.all([qctoPanel(ctx, actor), packSamples(ctx, actor, { qualificationId }), backupLog(ctx, actor)]);
  const back = `/admin/form5?qualification=${qualificationId}`;

  const documentForm = (item: ReadinessItem) =>
    item.manualLabel ? (
      <details className={styles.details}>
        <summary>{item.document ? "Replace document reference" : "Record document reference"}</summary>
        <form action={recordDocumentAction} className={styles.form}>
          <input type="hidden" name="back" value={`${back}#item-${item.code}`} />
          <input type="hidden" name="itemCode" value={item.code} />
          <label>
            Title
            <input name="title" className={ui.input} maxLength={200} required defaultValue={item.document?.title ?? ""} />
          </label>
          <label>
            Issued by
            <input name="issuer" className={ui.input} maxLength={200} defaultValue={item.document?.issuer ?? ""} />
          </label>
          <label>
            Where it is kept
            <input
              name="location"
              className={ui.input}
              maxLength={300}
              required
              placeholder="e.g. SharePoint > Compliance > ISP"
              defaultValue={item.document?.location ?? ""}
            />
          </label>
          <label>
            Valid until (optional)
            <input name="validUntil" type="date" className={ui.input} defaultValue={item.document?.validUntil ?? ""} />
          </label>
          <label>
            Notes
            <textarea name="notes" className={ui.textarea} maxLength={2000} rows={2} defaultValue={item.document?.notes ?? ""} />
          </label>
          <p className={ui.hint}>Only a reference is stored, never the file. Saving replaces the current reference; the old one is kept in the history.</p>
          <button type="submit" className={ui.button}>
            Save reference
          </button>
        </form>
      </details>
    ) : null;

  const guideBlock = (item: ReadinessItem) =>
    item.code === "4.2.2" ? (
      <details className={styles.details}>
        <summary>{r.guide ? "Learner guide" : "Upload the learner guide"}</summary>
        {r.guide ? (
          <p className={ui.hint}>
            Current: <strong>{r.guide.title}</strong> v{r.guide.version}, issued {r.guide.issuedOn}, {(r.guide.sizeBytes / 1024 / 1024).toFixed(1)} MB,
            uploaded by {r.guide.uploadedBy} on {dateFmt.format(r.guide.createdAt)} ·{" "}
            <a href={`/staff/evidence/form5/guide/${qualificationId}`}>Open</a>
          </p>
        ) : null}
        <GuideUploader qualificationId={qualificationId} replacing={Boolean(r.guide)} />
      </details>
    ) : null;

  const curriculumForm = (section: Form5Section) =>
    section === "4.4" ? (
      <details className={styles.details}>
        <summary>{r.curriculumRef ? "Replace the curriculum reference" : "Record the curriculum reference that confirms there is no workplace module"}</summary>
        <form action={curriculumReferenceAction} className={styles.form}>
          <input type="hidden" name="back" value={`${back}#sec-4.4`} />
          <input type="hidden" name="qualificationId" value={qualificationId} />
          <label>
            Document title
            <input name="documentTitle" className={ui.input} maxLength={200} required defaultValue={r.curriculumRef?.documentTitle ?? ""} />
          </label>
          <div className={styles.inline}>
            <label>
              Curriculum code
              <input name="curriculumCode" className={ui.input} maxLength={60} required defaultValue={r.curriculumRef?.curriculumCode ?? r.qualification.code} />
            </label>
            <label>
              Version
              <input name="version" className={ui.input} maxLength={40} required defaultValue={r.curriculumRef?.version ?? ""} />
            </label>
          </div>
          <label>
            Page or section
            <input name="location" className={ui.input} maxLength={200} required placeholder="e.g. page 12, section 3" defaultValue={r.curriculumRef?.location ?? ""} />
          </label>
          <label>
            Note
            <textarea name="note" className={ui.textarea} maxLength={1000} rows={2} defaultValue={r.curriculumRef?.note ?? ""} />
          </label>
          <button type="submit" className={ui.button}>
            Save curriculum reference
          </button>
        </form>
      </details>
    ) : null;

  return (
    <div className={styles.page}>
      <QualificationPicker title="Form 5 readiness" qualifications={quals} selected={qualificationId} />
      <p className={ui.muted}>
        {r.qualification.title} ({r.qualification.code}, NQF {r.qualification.nqfLevel}) · checked {dateFmt.format(r.generatedAt)}
      </p>
      <StatusBanner done={sp.done} error={sp.error} messages={DONE} />
      <SummaryBar counts={r.counts} />
      <p className={styles.panel}>
        <span>
          <strong>QCTO submissions:</strong> {panelSummaryLine(panel)} · <a href="/admin/qcto">Open QCTO submissions ›</a>
        </span>
      </p>
      <PackForm qualificationId={qualificationId} cohorts={samples.cohorts} cohortId={samples.cohort?.id ?? null} from={samples.from} to={samples.to} admin />
      <ManualStillNeeded items={r.manualStillNeeded} />
      <ReadinessView
        readiness={r}
        rowExtra={(item) => (
          <>
            {documentForm(item)}
            {guideBlock(item)}
          </>
        )}
        sectionExtra={curriculumForm}
      />
      <BackupsSection item={r.items.find((i) => i.code === "4.1.6")} log={log}>
        <details className={styles.details}>
          <summary>Log a restore test</summary>
          <form action={restoreTestAction} className={styles.form}>
            <input type="hidden" name="back" value={`${back}#backups`} />
            <label>
              Date of the test
              <input name="testedOn" type="date" className={ui.input} required />
            </label>
            <fieldset className={styles.inline} style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className={ui.label}>Did the restore work?</legend>
              <label className={ui.checkbox}>
                <input type="radio" name="result" value="ok" required /> <span>Worked</span>
              </label>
              <label className={ui.checkbox}>
                <input type="radio" name="result" value="failed" /> <span>Failed</span>
              </label>
            </fieldset>
            <label>
              What was restored and how you checked it
              <textarea name="notes" className={ui.textarea} maxLength={2000} rows={3} required />
            </label>
            <button type="submit" className={ui.button}>
              Log restore test
            </button>
          </form>
        </details>
      </BackupsSection>
    </div>
  );
}
