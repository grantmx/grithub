import type { Metadata } from "next";
import ui from "@/components/ui.module.css";
import { markingQueue, type QueueStatus } from "@/lib/server/marking";
import { requirePage } from "@/lib/server/page";
import { practicalQueue } from "@/lib/server/practicalMarking";

export const metadata: Metadata = { title: "Marking queue" };

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });

const FILTERS: { key: QueueStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "needs_marking", label: "Needs marking" },
  { key: "ready", label: "Ready to decide" },
  { key: "draft", label: "Draft" },
  { key: "referred_back", label: "Disagreed" },
  { key: "actions_due", label: "Actions due" },
  { key: "agreed", label: "Agreed" },
  { key: "decided", label: "Decided" },
];
const KINDS = [
  { key: "all", label: "Knowledge + practical" },
  { key: "knowledge", label: "Knowledge" },
  { key: "practical", label: "Practical" },
] as const;
type Kind = (typeof KINDS)[number]["key"];

const STATUS: Record<QueueStatus, { label: string; className?: string }> = {
  needs_marking: { label: "● Needs marking", className: ui.statusWarn },
  ready: { label: "Ready to decide" },
  draft: { label: "Draft saved" },
  referred_back: { label: "! Disagreed · re-decide", className: ui.statusBad },
  actions_due: { label: "• Agree with actions · to do", className: ui.statusWarn },
  agreed: { label: "✓ Agreed", className: ui.statusOk },
  decided: { label: "✓ Decided", className: ui.statusOk },
};

type Row = {
  key: string;
  href: string;
  kind: "knowledge" | "practical";
  learnerName: string;
  title: string;
  cohortName: string;
  attemptNo: number;
  submittedAt: Date | null;
  toMark: string;
  status: QueueStatus;
  outcome: "competent" | "not_yet_competent" | null;
};

/** Assessor marking queue (design.md S5): knowledge papers and practical evidence in my cohorts. */
export default async function MarkingQueuePage({ searchParams }: { searchParams: Promise<{ status?: string; kind?: string }> }) {
  const { ctx, actor } = await requirePage("/staff/marking");
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.status)?.key ?? "all";
  const kind: Kind = KINDS.find((k) => k.key === sp.kind)?.key ?? "all";
  const rows: Row[] = [];
  if (kind !== "practical") {
    for (const r of await markingQueue(ctx, actor)) {
      rows.push({
        key: `k-${r.attemptId}`,
        href: `/staff/marking/${r.attemptId}`,
        kind: "knowledge",
        learnerName: r.learnerName,
        title: r.title,
        cohortName: r.cohortName,
        attemptNo: r.attemptNo,
        submittedAt: r.submittedAt,
        toMark: r.toMark ? `${r.toMark} short answer${r.toMark === 1 ? "" : "s"}` : "–",
        status: r.status,
        outcome: r.outcome,
      });
    }
  }
  if (kind !== "knowledge") {
    for (const r of await practicalQueue(ctx, actor)) {
      rows.push({
        key: `p-${r.submissionId}`,
        href: `/staff/marking/practical/${r.submissionId}`,
        kind: "practical",
        learnerName: r.learnerName,
        title: `${r.title} · ${r.variantLabel}${r.observed ? " (observed)" : ""}`,
        cohortName: r.cohortName,
        attemptNo: r.attemptNo,
        submittedAt: r.submittedAt,
        toMark: r.toJudge ? `${r.toJudge} criteri${r.toJudge === 1 ? "on" : "a"}` : "–",
        status: r.status,
        outcome: r.outcome,
      });
    }
  }
  rows.sort((a, b) => (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0));
  const shown = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const href = (k: Kind, s: string) => {
    const qs = new URLSearchParams({ ...(k !== "all" ? { kind: k } : {}), ...(s !== "all" ? { status: s } : {}) }).toString();
    return `/staff/marking${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <h1 className={ui.h1}>Marking queue</h1>
      <nav aria-label="Filter by type" className={ui.chips}>
        {KINDS.map((k) => (
          <a key={k.key} href={href(k.key, filter)} className={k.key === kind ? ui.chipActive : ui.chip} aria-current={k.key === kind ? "true" : undefined}>
            {k.label}
          </a>
        ))}
      </nav>
      <nav aria-label="Filter by status" className={ui.chips}>
        {FILTERS.map((f) => (
          <a key={f.key} href={href(kind, f.key)} className={f.key === filter ? ui.chipActive : ui.chip} aria-current={f.key === filter ? "true" : undefined}>
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
              <th scope="col">Type</th>
              <th scope="col">Cohort</th>
              <th scope="col">Attempt</th>
              <th scope="col">Submitted</th>
              <th scope="col">To mark</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={8} className={ui.muted}>
                  {/* TODO(copy) */}
                  Nothing here right now.
                </td>
              </tr>
            ) : (
              shown.map((r) => (
                <tr key={r.key}>
                  <td>
                    <a href={r.href}>{r.learnerName}</a>
                  </td>
                  <td>{r.title}</td>
                  <td>{r.kind === "practical" ? "Practical" : "Knowledge"}</td>
                  <td>{r.cohortName}</td>
                  <td>{r.attemptNo}</td>
                  <td>{r.submittedAt ? dateFmt.format(r.submittedAt) : "–"}</td>
                  <td>{r.toMark}</td>
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
