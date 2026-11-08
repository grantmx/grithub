import type { Metadata } from "next";
import ui from "@/components/ui.module.css";
import { coverageReport } from "@/lib/server/analytics";
import { AssessmentError } from "@/lib/server/assessments";
import { coverageOptions } from "@/lib/server/authoring";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Coverage report" };

/**
 * Fairness guard: for every paper generated for a cohort, the questions
 * served per curriculum component must equal the blueprint (Form 5 evidence).
 */
export default async function CoveragePage({ searchParams }: { searchParams: Promise<{ blueprint?: string; cohort?: string }> }) {
  const { ctx, actor } = await requirePage("/admin/assessments/coverage");
  const sp = await searchParams;
  const options = await coverageOptions(ctx, actor);
  const chosen = options.find((o) => o.blueprintId === sp.blueprint && o.cohortId === sp.cohort) ?? options[0];
  let report = null;
  if (chosen) {
    try {
      report = await coverageReport(ctx, actor, chosen.blueprintId, chosen.cohortId);
    } catch (e) {
      if (!(e instanceof AssessmentError)) throw e;
    }
  }

  return (
    <>
      <p className={ui.hint}>
        <a href="/admin/assessments">Assessments</a>
      </p>
      <h1 className={ui.h1}>Coverage report</h1>
      {options.length === 0 ? <p className={ui.muted}>No assessments have been scheduled yet.</p> : null}
      {options.length ? (
        <nav aria-label="Assessment and cohort" className={ui.chips}>
          {options.map((o) => {
            const active = chosen && o.blueprintId === chosen.blueprintId && o.cohortId === chosen.cohortId;
            return (
              <a
                key={`${o.blueprintId}:${o.cohortId}`}
                href={`/admin/assessments/coverage?blueprint=${o.blueprintId}&cohort=${o.cohortId}`}
                className={active ? ui.chipActive : ui.chip}
                aria-current={active ? "true" : undefined}
              >
                {o.title} · {o.cohortName}
              </a>
            );
          })}
        </nav>
      ) : null}
      {report ? (
        <>
          <p className={report.allEqual ? ui.bannerSuccess : ui.bannerError} role="status">
            {report.papers === 0
              ? "No papers generated yet."
              : report.allEqual
                ? `All ${report.papers} papers have equal curriculum coverage.`
                : "Some papers do not match the blueprint. Investigate before using these results."}
            {report.fallbackPapers ? ` ${report.fallbackPapers} paper(s) reused questions because a bank ran short.` : ""}
          </p>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th scope="col">Curriculum component</th>
                  <th scope="col">Per paper (blueprint)</th>
                  <th scope="col">Served (min–max)</th>
                  <th scope="col">Equal</th>
                </tr>
              </thead>
              <tbody>
                {report.rules.map((r) => (
                  <tr key={r.component}>
                    <td>{r.component}</td>
                    <td>{r.required}</td>
                    <td>
                      {report.papers ? `${r.minServed}–${r.maxServed}` : "–"}
                    </td>
                    <td className={r.ok ? ui.statusOk : ui.statusBad}>{r.ok ? "✓ Yes" : "✗ No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {report.uncovered.length ? (
            <p className={ui.bannerInfo}>Curriculum components of this module not covered by the blueprint: {report.uncovered.join(", ")}.</p>
          ) : null}
        </>
      ) : null}
    </>
  );
}
