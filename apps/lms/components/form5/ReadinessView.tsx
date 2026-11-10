import type { ReactNode } from "react";
import { SAST } from "@/components/comms/staff/Shared";
import ui from "@/components/ui.module.css";
import { type Form5Section, type ItemStatus, SECTION_TITLES, STATUS_LABEL } from "@/lib/form5";
import type { BackupLogRow } from "@/lib/server/backup";
import type { Readiness, ReadinessItem } from "@/lib/server/readiness";
import styles from "./form5.module.css";

/**
 * Form 5 readiness table (design.md §14, 2026-11-09, approved layout):
 * summary bar, then one dense table per section 4.1–4.4 (ID · Item ·
 * Status · Live check · Evidence). Server-rendered; the admin page passes
 * edit forms per row through `rowExtra`, the evaluator page renders it read-only.
 */

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeZone: SAST });
const dateTimeFmt = new Intl.DateTimeFormat("en-ZA", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: SAST,
});

const STATUS_CLASS: Record<ItemStatus, string> = {
  ready: styles.ready!,
  attention: styles.attention!,
  manual: styles.manual!,
  na: styles.na!,
};

export function StatusTag({ status }: { status: ItemStatus }) {
  const s = STATUS_LABEL[status];
  return (
    <span className={`${styles.status} ${STATUS_CLASS[status]}`}>
      <span aria-hidden="true">{s.icon}</span> {s.word}
    </span>
  );
}

export function SummaryBar({ counts }: { counts: Readiness["counts"] }) {
  return (
    <p className={styles.summary} aria-label="Summary">
      <span className={styles.ready}>✓ {counts.ready} ready</span>
      <span className={styles.attention}>! {counts.attention} need attention</span>
      <span>▢ {counts.manual} manual documents</span>
      <span className={styles.na}>– {counts.na} not applicable</span>
    </p>
  );
}

function EvidenceLinks({ item }: { item: ReadinessItem }) {
  if (item.links.length === 0) return <span className={styles.muted}>—</span>;
  return (
    <ul className={styles.lines}>
      {item.links.map((l) => {
        const external = /^https?:\/\//.test(l.href);
        return (
          <li key={l.href + l.label}>
            {external ? (
              <a href={l.href} target="_blank" rel="noopener noreferrer">
                {l.label} ↗<span className={ui.srOnly}> (opens in a new tab)</span>
              </a>
            ) : (
              <a href={l.href}>{l.label} ›</a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function LiveCheck({ item }: { item: ReadinessItem }) {
  const d = item.document;
  return (
    <ul className={styles.lines}>
      {item.manualLabel && !d ? <li>Needs: {item.manualLabel}</li> : null}
      {item.facts.map((f) => (
        <li key={f}>{f}</li>
      ))}
      {item.problems.map((p) => (
        <li key={p} className={styles.problem}>
          <span aria-hidden="true">!</span> {p}
        </li>
      ))}
      {d ? (
        <li className={styles.docRef}>
          Document: <strong>{d.title}</strong>
          {d.issuer ? `, ${d.issuer}` : ""}; kept at {d.location}
          {d.validUntil ? `; valid until ${d.validUntil}` : ""}
          {d.notes ? ` (${d.notes})` : ""} · recorded by {d.recordedBy}, {dateFmt.format(d.createdAt)}
        </li>
      ) : null}
    </ul>
  );
}

export function ReadinessView({
  readiness,
  rowExtra,
  sectionExtra,
}: {
  readiness: Readiness;
  /** Admin-only edit controls rendered under an item's live check. */
  rowExtra?: (item: ReadinessItem) => ReactNode;
  /** Admin-only content above a section's table (e.g. the 4.4 curriculum reference form). */
  sectionExtra?: (section: Form5Section) => ReactNode;
}) {
  const sections = ["4.1", "4.2", "4.3", "4.4"] as const;
  return (
    <>
      {sections.map((section) => (
        <section key={section} className={styles.panel} aria-labelledby={`sec-${section}`}>
          <h2 id={`sec-${section}`}>
            {section} {SECTION_TITLES[section]}
          </h2>
          {sectionExtra?.(section)}
          <div className={ui.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Item</th>
                  <th scope="col">Status</th>
                  <th scope="col">Live check</th>
                  <th scope="col">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {readiness.items
                  .filter((i) => i.section === section)
                  .map((item) => (
                    <tr key={item.code} id={`item-${item.code}`}>
                      <td className={styles.code}>{item.code}</td>
                      <td>{item.title}</td>
                      <td>
                        <StatusTag status={item.status} />
                      </td>
                      <td>
                        <LiveCheck item={item} />
                        {rowExtra?.(item)}
                      </td>
                      <td>
                        <EvidenceLinks item={item} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}

export function ManualStillNeeded({ items }: { items: Readiness["manualStillNeeded"] }) {
  return (
    <section className={styles.panel} aria-labelledby="manual-needed">
      <h2 id="manual-needed">Still needs a manual document</h2>
      {items.length === 0 ? (
        <p className={styles.muted}>None: every manual document has a reference recorded.</p>
      ) : (
        <ul className={styles.lines}>
          {items.map((m) => (
            <li key={m.code}>
              <a href={`#item-${m.code}`}>{m.code}</a> {m.label}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const KIND_LABEL: Record<BackupLogRow["kind"], string> = {
  backup: "Backup",
  restore_test: "Restore test",
  prune: "Old backups deleted",
};

function size(bytes: number | null) {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function BackupsSection({ item, log, children }: { item: ReadinessItem | undefined; log: BackupLogRow[]; children?: ReactNode }) {
  return (
    <section id="backups" className={styles.panel} aria-labelledby="backups-title">
      <h2 id="backups-title">Backup and restore log</h2>
      {item ? (
        <div className={styles.inline}>
          <StatusTag status={item.status} />
          <ul className={styles.lines}>
            {item.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
            {item.problems.map((p) => (
              <li key={p} className={styles.problem}>
                <span aria-hidden="true">!</span> {p}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {children}
      {log.length === 0 ? (
        <p className={styles.muted}>No backups or restore tests logged yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Kind</th>
                <th scope="col">Result</th>
                <th scope="col">Size</th>
                <th scope="col">Tables / rows</th>
                <th scope="col">SHA-256</th>
                <th scope="col">Recorded by</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              {log.map((b) => (
                <tr key={b.id}>
                  <td>{dateTimeFmt.format(b.startedAt)}</td>
                  <td>{KIND_LABEL[b.kind]}</td>
                  <td>
                    {b.status === "ok" ? (
                      <span className={`${styles.status} ${styles.ready}`}>
                        <span aria-hidden="true">✓</span> OK
                      </span>
                    ) : (
                      <span className={`${styles.status} ${styles.bad}`}>
                        <span aria-hidden="true">✗</span> Failed
                      </span>
                    )}
                  </td>
                  <td>{size(b.sizeBytes)}</td>
                  <td>{b.tableCount !== null ? `${b.tableCount} / ${b.rowCount ?? 0}` : "—"}</td>
                  <td>
                    {b.sha256 ? (
                      <span className={styles.hash} title={b.sha256}>
                        {b.sha256.slice(0, 12)}…
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{b.recordedBy ?? (b.kind === "restore_test" ? "—" : "Automatic")}</td>
                  <td>
                    {b.notes}
                    {b.prunedAt ? `${b.notes ? " · " : ""}file deleted ${dateFmt.format(b.prunedAt)}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Evidence pack form: GET to the pack route (same for admins and evaluators). */
export function PackForm({
  qualificationId,
  cohorts,
  cohortId,
  from,
  to,
  admin,
}: {
  qualificationId: string;
  cohorts: { id: string; name: string }[];
  cohortId: string | null;
  from: string;
  to: string;
  admin: boolean;
}) {
  // TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
  return (
    <form method="get" action="/staff/evidence/form5/pack" className={styles.panel}>
      <h2>Evidence pack</h2>
      <input type="hidden" name="qualification" value={qualificationId} />
      <div className={styles.inline}>
        {cohorts.length > 0 ? (
          <label className={styles.form} style={{ padding: 0 }}>
            Sample cohort
            <select name="cohort" className={ui.select} defaultValue={cohortId ?? ""}>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className={styles.form} style={{ padding: 0 }}>
          Communication from
          <input type="date" name="from" className={ui.input} defaultValue={from} />
        </label>
        <label className={styles.form} style={{ padding: 0 }}>
          to
          <input type="date" name="to" className={ui.input} defaultValue={to} />
        </label>
        <button type="submit" className={ui.button}>
          Download evidence pack (PDF)
        </button>
      </div>
      <p className={styles.muted}>
        One PDF: readiness snapshot, assessment schedule, a sample randomised paper, a sample moderation report, a communication log
        sample and the backup and restore log. Learners are shown as &quot;Learner A&quot;, &quot;Learner B&quot;.{" "}
        {admin ? "Answer keys and per-question marks are left out of exports by SDP admins. " : ""}Every export is recorded in the audit
        log.
      </p>
    </form>
  );
}

/** GET form to switch qualification. */
export function QualificationPicker({
  title,
  qualifications,
  selected,
}: {
  title: string;
  qualifications: { id: string; title: string; code: string }[];
  selected: string;
}) {
  return (
    <form method="get" className={styles.toolbar}>
      <h1 className={ui.h1}>{title} ·</h1>
      <label htmlFor="qualification" className={ui.srOnly}>
        Qualification
      </label>
      <select id="qualification" name="qualification" className={ui.select} defaultValue={selected} style={{ width: "auto" }}>
        {qualifications.map((q) => (
          <option key={q.id} value={q.id}>
            {q.title} ({q.code})
          </option>
        ))}
      </select>
      <button type="submit" className={ui.secondary}>
        Show
      </button>
    </form>
  );
}
