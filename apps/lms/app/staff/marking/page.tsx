import type { Metadata } from "next";
import ui from "@/components/ui.module.css";
import { markingQueue, type QueueStatus } from "@/lib/server/marking";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Marking queue" };

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });

const FILTERS: { key: QueueStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "needs_marking", label: "Needs marking" },
  { key: "ready", label: "Ready to decide" },
  { key: "draft", label: "Draft" },
  { key: "referred_back", label: "Referred back" },
  { key: "decided", label: "Decided" },
];

const STATUS: Record<QueueStatus, { label: string; className?: string }> = {
  needs_marking: { label: "● Needs marking", className: ui.statusWarn },
  ready: { label: "Ready to decide" },
  draft: { label: "Draft saved" },
  referred_back: { label: "! Referred back", className: ui.statusBad },
  decided: { label: "✓ Decided", className: ui.statusOk },
};

/** Assessor marking queue (design.md S5): summative papers in my cohorts. */
export default async function MarkingQueuePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { ctx, actor } = await requirePage("/staff/marking");
  const { status } = await searchParams;
  const filter = FILTERS.find((f) => f.key === status)?.key ?? "all";
  const rows = await markingQueue(ctx, actor, { status: filter });

  return (
    <>
      <h1 className={ui.h1}>Marking queue</h1>
      <nav aria-label="Filter by status" className={ui.chips}>
        {FILTERS.map((f) => (
          <a
            key={f.key}
            href={f.key === "all" ? "/staff/marking" : `/staff/marking?status=${f.key}`}
            className={f.key === filter ? ui.chipActive : ui.chip}
            aria-current={f.key === filter ? "true" : undefined}
          >
            {f.label}
          </a>
        ))}
      </nav>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th scope="col">Learner</th>
              <th scope="col">Assessment</th>
              <th scope="col">Cohort</th>
              <th scope="col">Attempt</th>
              <th scope="col">Submitted</th>
              <th scope="col">To mark</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className={ui.muted}>
                  {/* TODO(copy) */}
                  Nothing here right now.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.attemptId}>
                  <td>
                    <a href={`/staff/marking/${r.attemptId}`}>{r.learnerName}</a>
                  </td>
                  <td>{r.title}</td>
                  <td>{r.cohortName}</td>
                  <td>{r.attemptNo}</td>
                  <td>{r.submittedAt ? dateFmt.format(r.submittedAt) : "–"}</td>
                  <td>{r.toMark ? `${r.toMark} short answer${r.toMark === 1 ? "" : "s"}` : "–"}</td>
                  <td className={STATUS[r.status].className}>
                    {STATUS[r.status].label}
                    {r.outcome ? ` · ${r.outcome === "competent" ? "C" : "NYC"}` : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
