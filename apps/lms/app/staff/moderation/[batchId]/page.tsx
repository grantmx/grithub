import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { closeBatchAction, setSampleAction } from "@/app/staff/assess-actions";
import styles from "@/components/assess/staff.module.css";
import ui from "@/components/ui.module.css";
import { SAMPLE_STATE_LABEL, type SampleState } from "@/lib/moderation";
import { AssessmentError } from "@/lib/server/assessments";
import { getBatch } from "@/lib/server/moderation";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Moderation batch" };

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });

const FILTERS = [
  { key: "all", label: "All" },
  { key: "sample", label: "In sample" },
  { key: "nyc", label: "Not yet competent" },
  { key: "unchecked", label: "Not checked" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

const STATE_CLASS: Partial<Record<SampleState, string>> = {
  agreed: ui.statusOk,
  actions_done: ui.statusOk,
  actions_open: ui.statusWarn,
  disagreed: ui.statusBad,
  recheck: ui.statusWarn,
};

/**
 * S7 batch page (design.md §14, 2026-11-08): every decision in one table with
 * an "In sample" checkbox (locked once moderated); rate, progress and the
 * release panel at the top; filters in the URL.
 */
export default async function BatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<{ done?: string; error?: string; filter?: string }>;
}) {
  const { batchId } = await params;
  const sp = await searchParams;
  const path = `/staff/moderation/${batchId}`;
  const { ctx, actor } = await requirePage(path);
  let b;
  try {
    b = await getBatch(ctx, actor, batchId);
  } catch (e) {
    if (e instanceof AssessmentError) notFound();
    throw e;
  }
  const open = b.batch.status === "open";
  const filter: Filter = FILTERS.find((f) => f.key === sp.filter)?.key ?? "all";
  const here = filter === "all" ? path : `${path}?filter=${filter}`;
  const visible = b.rows.filter((r) =>
    filter === "sample"
      ? r.sample
      : filter === "nyc"
        ? r.current.outcome === "not_yet_competent"
        : filter === "unchecked"
          ? r.state === "to_check" || r.state === "recheck"
          : true,
  );
  const hiddenSampled = b.rows.filter((r) => r.sample && !visible.includes(r));
  const s = b.summary;
  const released = sp.done?.startsWith("released:") ? sp.done.slice(9) : null;
  const sampleChange = sp.done?.startsWith("sample:") ? sp.done.slice(7).split(":") : null;

  return (
    <div className={ui.stack}>
      <p className={ui.hint}>
        <a href="/staff/moderation">Moderation sample</a> › {b.cohortName}
      </p>
      <div className={ui.spread}>
        <h1 className={ui.h1} style={{ margin: 0 }}>
          {b.title}
        </h1>
        <span className={ui.row}>
          <a className={ui.secondary} href={`${path}/report/pdf`}>
            Moderation report (PDF)
          </a>
          <a className={ui.secondary} href={`${path}/report/csv`}>
            CSV
          </a>
        </span>
      </div>

      {released ? (
        <p role="status" className={ui.bannerSuccess}>
          Sample closed. {released} result{released === "1" ? "" : "s"} released to learners.
        </p>
      ) : sampleChange ? (
        <p role="status" className={ui.bannerSuccess}>
          Sample saved: {sampleChange[0]} added, {sampleChange[1]} removed.
        </p>
      ) : null}
      {sp.error ? (
        <p role="alert" className={ui.bannerError}>
          {sp.error}
        </p>
      ) : null}

      <section className={styles.panel} aria-labelledby="progress-title">
        <h2 id="progress-title" className={styles.panelTitle}>
          {open ? "Sample and release" : "Closed"}
        </h2>
        <p>
          Rate <strong>{s.rate}%</strong> <span className={ui.hint}>(set by the admin for {b.cohortName})</span> · Sample{" "}
          <strong>
            {s.sampled} of minimum {s.minimum}
          </strong>{" "}
          · Agreed{" "}
          <strong>
            {s.agreed} of {s.sampled}
          </strong>{" "}
          · {s.decided} decision{s.decided === 1 ? "" : "s"} in the batch
        </p>
        {open ? (
          <form action={closeBatchAction} className={ui.stack}>
            <input type="hidden" name="batchId" value={batchId} />
            <input type="hidden" name="back" value={here} />
            {s.blockers.length ? (
              <ul className={ui.hint} aria-label="Before you can release">
                {s.blockers.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            ) : (
              <label className={ui.checkbox}>
                <input type="checkbox" name="confirm" value="1" />
                <span>
                  Release {b.learnersToNotify} result{b.learnersToNotify === 1 ? "" : "s"} to learners now. Decisions in this batch become
                  final and the batch can&apos;t be reopened.
                </span>
              </label>
            )}
            <div>
              <button type="submit" className={ui.button} disabled={!s.canClose} aria-disabled={!s.canClose}>
                Close and release {b.learnersToNotify} result{b.learnersToNotify === 1 ? "" : "s"}
              </button>
            </div>
          </form>
        ) : (
          <p className={ui.bannerInfo}>
            Closed {b.batch.closedAt ? dateFmt.format(b.batch.closedAt) : ""}. Results are released and the sample is final.
          </p>
        )}
      </section>

      <nav className={ui.chips} aria-label="Filter">
        {FILTERS.map((f) => (
          <a
            key={f.key}
            href={f.key === "all" ? path : `${path}?filter=${f.key}`}
            className={`${ui.chip} ${f.key === filter ? ui.chipActive : ""}`}
            aria-current={f.key === filter ? "true" : undefined}
          >
            {f.label}
          </a>
        ))}
      </nav>

      <form action={setSampleAction} className={ui.stack}>
        <input type="hidden" name="batchId" value={batchId} />
        <input type="hidden" name="back" value={here} />
        {hiddenSampled.map((r) => (
          <input key={r.targetId} type="hidden" name="sample" value={r.targetId} />
        ))}
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th scope="col">Sample</th>
                <th scope="col">Learner</th>
                <th scope="col">Decision</th>
                <th scope="col">Score</th>
                <th scope="col">Moderation</th>
                <th scope="col">
                  <span className={ui.srOnly}>Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className={ui.muted}>
                    Nothing matches this filter.
                  </td>
                </tr>
              ) : (
                visible.map((r) => {
                  const fixed = !open || r.locked || r.sample?.reason === "reassessment";
                  return (
                    <tr key={r.targetId}>
                      <td>
                        <label className={ui.checkbox}>
                          <input
                            type="checkbox"
                            name={fixed ? undefined : "sample"}
                            value={r.targetId}
                            defaultChecked={!!r.sample}
                            disabled={fixed}
                            aria-label={`${r.learnerName} in sample`}
                          />
                          {fixed && r.sample ? <input type="hidden" name="sample" value={r.targetId} /> : null}
                          {r.sample?.reason === "reassessment" ? <span className={ui.hint}>Appeal</span> : null}
                        </label>
                      </td>
                      <td>{r.learnerName}</td>
                      <td>
                        {r.current.outcome === "competent" ? "Competent" : "Not yet competent"}
                        <div className={ui.hint}>
                          {dateFmt.format(r.current.decidedAt)}
                          {r.versions.length > 1 ? ` · version ${r.versions.length}` : ""}
                        </div>
                      </td>
                      <td>{r.score ?? "–"}</td>
                      <td className={STATE_CLASS[r.state]}>
                        {r.ownDecision ? <span className={ui.hint}>Your decision · </span> : null}
                        {SAMPLE_STATE_LABEL[r.state]}
                      </td>
                      <td>
                        <a href={`${path}/item/${r.targetId}`} aria-label={`Open ${r.learnerName}`}>
                          {r.sample && open ? "Moderate →" : "View →"}
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {open ? (
          <div>
            <button type="submit" className={ui.secondary}>
              Save sample
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
