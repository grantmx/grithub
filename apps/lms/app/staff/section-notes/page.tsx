import type { Metadata } from "next";
import { addNoteAction, archiveNoteAction } from "@/app/staff/comms-actions";
import { Icon } from "@/components/Icon";
import styles from "@/components/comms/staff.module.css";
import { CohortPicker, NoCohorts, StatusBanner, dateFmt } from "@/components/comms/staff/Shared";
import ui from "@/components/ui.module.css";
import { staffCohorts } from "@/lib/server/comms";
import { requirePage } from "@/lib/server/page";
import { NOTE_ROLES, listCohortNotes } from "@/lib/server/sectionNotes";

export const metadata: Metadata = { title: "Section notes" };
export const dynamic = "force-dynamic";

// TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
const DONE = { note_added: "Note added. Learners in the cohort see it on the section page.", note_removed: "Note removed." };

/**
 * Facilitator notes and recording links per section, for one cohort
 * (design.md §14, 2026-11-08; Form 5 4.2.10).
 */
export default async function SectionNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string; done?: string; error?: string }>;
}) {
  const { ctx, actor } = await requirePage("/staff/section-notes");
  const sp = await searchParams;
  const cohorts = await staffCohorts(ctx, actor, NOTE_ROLES);
  const cohort = cohorts.find((c) => c.id === sp.cohort) ?? cohorts[0];
  if (!cohort) return <NoCohorts title="Section notes" />;
  const outline = await listCohortNotes(ctx, actor, cohort.id);
  const back = `/staff/section-notes?cohort=${cohort.id}`;
  const modules = [...new Map(outline.map((s) => [s.moduleId, { code: s.moduleCode, title: s.moduleTitle }])).entries()];

  return (
    <div className={styles.page}>
      <CohortPicker title="Section notes" cohorts={cohorts} selected={cohort.id} />
      <p className={ui.muted}>
        Notes and recording links show only to {cohort.name}, on the section page after the lesson text and before the check.
      </p>
      <StatusBanner done={sp.done} error={sp.error} messages={DONE} />
      {outline.length === 0 ? <p className={ui.muted}>This programme has no sections yet.</p> : null}

      {modules.map(([moduleId, m]) => (
        <section key={moduleId} aria-labelledby={`mod-${moduleId}`}>
          <h2 id={`mod-${moduleId}`} className={styles.moduleTitle}>
            {m.code}: {m.title}
          </h2>
          {outline
            .filter((s) => s.moduleId === moduleId)
            .map((s) => (
              <div key={s.sectionId} className={styles.section}>
                <h3 className={styles.sectionTitle}>{s.sectionTitle}</h3>
                {s.notes.length === 0 ? <p className={styles.meta}>No notes.</p> : null}
                {s.notes.map((n) => (
                  <div key={n.id} className={styles.item}>
                    <div className={styles.itemHead}>
                      <strong>{n.author}</strong>
                      <span className={styles.meta}>{dateFmt.format(n.createdAt)}</span>
                    </div>
                    {n.body ? <p className={styles.body}>{n.body}</p> : null}
                    {n.recordingUrl ? (
                      <p className={styles.body}>
                        <a href={n.recordingUrl} target="_blank" rel="noopener noreferrer">
                          {n.recordingLabel ?? "Recording"} <Icon name="link" size={14} />
                        </a>
                      </p>
                    ) : null}
                    <form action={archiveNoteAction}>
                      <input type="hidden" name="noteId" value={n.id} />
                      <input type="hidden" name="back" value={back} />
                      <button type="submit" className={ui.textButton}>
                        Remove (learners stop seeing it; it stays in the log)
                      </button>
                    </form>
                  </div>
                ))}
                <details className={styles.details}>
                  <summary>Add a note</summary>
                  <form action={addNoteAction} className={styles.form}>
                    <input type="hidden" name="cohortId" value={cohort.id} />
                    <input type="hidden" name="sectionId" value={s.sectionId} />
                    <input type="hidden" name="back" value={back} />
                    <div className={ui.field}>
                      <label htmlFor={`n-body-${s.sectionId}`} className={ui.label}>
                        Note
                      </label>
                      <textarea id={`n-body-${s.sectionId}`} name="body" className={ui.textarea} rows={3} maxLength={5000} />
                    </div>
                    <div className={styles.grid2}>
                      <div className={ui.field}>
                        <label htmlFor={`n-url-${s.sectionId}`} className={ui.label}>
                          Recording link (optional)
                        </label>
                        <input id={`n-url-${s.sectionId}`} name="recordingUrl" type="url" className={ui.input} />
                      </div>
                      <div className={ui.field}>
                        <label htmlFor={`n-label-${s.sectionId}`} className={ui.label}>
                          Recording label (optional)
                        </label>
                        <input id={`n-label-${s.sectionId}`} name="recordingLabel" className={ui.input} maxLength={120} />
                      </div>
                    </div>
                    <p className={ui.hint}>Write a note, add a recording link, or both. Links: Zoom cloud, YouTube, Vimeo, Google Drive or OneDrive.</p>
                    <div>
                      <button type="submit" className={ui.button}>
                        Add note
                      </button>
                    </div>
                  </form>
                </details>
              </div>
            ))}
        </section>
      ))}
    </div>
  );
}
