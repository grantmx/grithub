import type { Metadata } from "next";
import styles from "@/components/assess/staff.module.css";
import ui from "@/components/ui.module.css";
import { listMaterials } from "@/lib/server/materials";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Assessment materials" };

/**
 * Moderator, read-only (design.md §14, 2026-11-08): question banks,
 * formative assessments and section checks for the qualifications of my cohorts.
 */
export default async function MaterialsPage() {
  const { ctx, actor } = await requirePage("/staff/materials");
  const mods = await listMaterials(ctx, actor);
  return (
    <div className={ui.stack}>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        Assessment materials
      </h1>
      <p className={ui.bannerInfo} role="note">
        Read-only. Question versions, answer keys and rubrics exactly as authored. Assessors create new versions; flag issues in your
        moderation comments.
      </p>
      {mods.length === 0 ? <p className={ui.muted}>No knowledge modules in your cohorts yet.</p> : null}
      {mods.map((m) => (
        <section key={m.id} className={styles.panel} aria-labelledby={`m-${m.id}`}>
          <h2 id={`m-${m.id}`} className={styles.panelTitle}>
            {m.code} {m.title} <span className={ui.hint}>· {m.qualificationTitle}</span>
          </h2>
          <h3 className={ui.label}>Question banks</h3>
          {m.banks.length ? (
            <ul className={styles.history}>
              {m.banks.map((b) => (
                <li key={b.id}>
                  <a href={`/staff/materials/banks/${b.id}`}>
                    {b.component} · {b.title}
                  </a>{" "}
                  <span className={ui.hint}>
                    {b.active} active of {b.total} questions
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={ui.hint}>No banks.</p>
          )}
          <h3 className={ui.label}>Formative assessments</h3>
          {m.formatives.length ? (
            <ul className={styles.history}>
              {m.formatives.map((f) => (
                <li key={f.id}>
                  <a href={`/staff/materials/formatives/${f.id}`}>{f.title}</a> <span className={ui.hint}>{f.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={ui.hint}>No formative assessments.</p>
          )}
          <h3 className={ui.label}>Section checks</h3>
          {m.checks.length ? (
            <ul className={styles.history}>
              {m.checks.map((c) => (
                <li key={c.sectionId}>
                  <a href={`/staff/materials/checks/${c.sectionId}`}>
                    {c.component} · {c.title}
                  </a>{" "}
                  <span className={ui.hint}>{c.questions} questions in the pool</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={ui.hint}>No section checks.</p>
          )}
        </section>
      ))}
    </div>
  );
}
