import type { Metadata } from "next";
import { resolveReportAction } from "@/app/staff/comms-actions";
import { Icon } from "@/components/Icon";
import styles from "@/components/comms/staff.module.css";
import { StatusBanner, longDateTimeFmt } from "@/components/comms/staff/Shared";
import ui from "@/components/ui.module.css";
import { listReports } from "@/lib/server/contentReports";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

// TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
const DONE = {
  hidden: "Hidden. Others now see “Removed by a facilitator”; the original stays in the communication log.",
  dismissed: "Report dismissed.",
};

/**
 * Report queue (design.md §14, 2026-11-08): hide the reported item or dismiss
 * the report. Message reports are shown to SDP admins only.
 */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ status?: string; done?: string; error?: string }> }) {
  const { ctx, actor } = await requirePage("/staff/reports");
  const sp = await searchParams;
  const status = sp.status === "closed" ? "closed" : "open";
  const rows = await listReports(ctx, actor, status);
  const back = `/staff/reports?status=${status}`;

  return (
    <div className={styles.page}>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        Reports
      </h1>
      <p className={ui.muted}>
        Posts and messages learners have reported. Discussion reports go to the cohort&apos;s facilitators and SDP admins; reports about
        private messages go to SDP admins only.
      </p>
      <nav aria-label="Report status" className={ui.chips}>
        {(
          [
            ["open", "Open"],
            ["closed", "Reviewed"],
          ] as const
        ).map(([v, label]) => (
          <a key={v} href={`/staff/reports?status=${v}`} className={`${ui.chip} ${v === status ? ui.chipActive : ""}`} aria-current={v === status ? "page" : undefined}>
            {label}
          </a>
        ))}
      </nav>
      <StatusBanner done={sp.done} error={sp.error} messages={DONE} />

      {rows.length === 0 ? (
        <p className={ui.muted}>{status === "open" ? "No open reports." : "No reviewed reports yet."}</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((r) => (
            <li key={r.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={`${styles.status} ${styles.warn}`}>
                  <Icon name="report" size={16} /> {r.reasonLabel}
                </span>
                <span className={styles.meta}>
                  {r.cohortName} · reported {longDateTimeFmt.format(r.createdAt)}
                </span>
                {r.status !== "open" ? (
                  <span className={styles.tag}>{r.status === "hidden" ? "Hidden" : "Dismissed"}</span>
                ) : null}
              </div>
              <p className={styles.meta}>
                {r.item?.threadId ? (
                  <a href={`/staff/discussions/thread/${r.item.threadId}`}>{r.item.where}</a>
                ) : (
                  (r.item?.where ?? "Item not found")
                )}
              </p>
              {r.note ? <p className={styles.body}>Learner&apos;s note: {r.note}</p> : null}
              {r.item ? (
                <blockquote className={styles.bubble} style={{ margin: 0 }}>
                  <div className={styles.itemHead}>
                    <strong>{r.item.author}</strong>
                    <span className={styles.meta}>
                      {longDateTimeFmt.format(r.item.createdAt)}
                      {r.item.hidden ? " · hidden" : ""}
                    </span>
                  </div>
                  <p className={styles.body}>{r.item.body}</p>
                </blockquote>
              ) : null}
              {r.status === "open" ? (
                <div className={styles.actions}>
                  <form action={resolveReportAction} className={ui.stack}>
                    <input type="hidden" name="reportId" value={r.id} />
                    <input type="hidden" name="back" value={back} />
                    <input type="hidden" name="outcome" value="hide" />
                    <p className={ui.hint}>Hiding: others will see “Removed by a facilitator”. The original stays in the log.</p>
                    <div className={styles.actions}>
                      <button type="submit" className={ui.button}>
                        <Icon name="hide" size={18} /> Hide
                      </button>
                    </div>
                  </form>
                  <form action={resolveReportAction}>
                    <input type="hidden" name="reportId" value={r.id} />
                    <input type="hidden" name="back" value={back} />
                    <input type="hidden" name="outcome" value="dismiss" />
                    <button type="submit" className={ui.secondary}>
                      Dismiss
                    </button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
