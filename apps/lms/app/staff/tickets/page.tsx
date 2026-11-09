import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import styles from "@/components/comms/staff.module.css";
import { dateTimeFmt } from "@/components/comms/staff/Shared";
import ui from "@/components/ui.module.css";
import { requirePage } from "@/lib/server/page";
import { TicketStatus } from "@/components/comms/staff/TicketStatus";
import { type StaffTicketFilter, type TicketCategory, listStaffTickets, ticketSummary } from "@/lib/server/tickets";
import { dueLabel } from "@/lib/workingTime";

export const metadata: Metadata = { title: "Support tickets" };
export const dynamic = "force-dynamic";

const FILTERS: { value: StaffTicketFilter; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "overdue", label: "Overdue" },
  { value: "mine", label: "Assigned to me" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
];

const CATEGORY_SHORT: Record<TicketCategory, string> = { academic: "Academic", technical: "Technical", admin: "Admin" };

/**
 * Support tickets (design.md §14, 2026-11-08): targets are first reply within
 * 1 working day and resolved within 5. The summary line is the Form 5 4.2.11
 * response-time evidence.
 */
export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { ctx, actor } = await requirePage("/staff/tickets");
  const sp = await searchParams;
  const filter = (FILTERS.find((f) => f.value === sp.filter)?.value ?? "active") as StaffTicketFilter;
  const now = ctx.now();
  const [rows, summary] = await Promise.all([
    listStaffTickets(ctx, actor, filter),
    ticketSummary(ctx, actor, new Date(now.getTime() - 90 * 86_400_000)),
  ]);

  return (
    <div className={styles.page}>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        Support tickets
      </h1>
      <p className={styles.summary}>
        Last 90 days: {summary.raised} raised · first reply on time {summary.firstReplyOnTime} of {summary.answered} answered · resolved on
        time {summary.resolvedOnTime} of {summary.resolved} resolved. Targets: first reply within 1 working day, resolved within 5.
      </p>
      <nav aria-label="Filter tickets" className={ui.chips}>
        {FILTERS.map((f) => (
          <a
            key={f.value}
            href={`/staff/tickets?filter=${f.value}`}
            className={`${ui.chip} ${f.value === filter ? ui.chipActive : ""}`}
            aria-current={f.value === filter ? "page" : undefined}
          >
            {f.label}
          </a>
        ))}
      </nav>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th scope="col">Subject</th>
              <th scope="col">Learner</th>
              <th scope="col">Category</th>
              <th scope="col">Cohort</th>
              <th scope="col">Status</th>
              <th scope="col">Target</th>
              <th scope="col">Assigned</th>
              <th scope="col">Raised</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className={ui.muted}>
                  No tickets here.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const open = r.status === "open" || r.status === "in_progress";
                const due = r.firstRespondedAt ? r.resolveDueAt : r.firstResponseDueAt;
                const label = dueLabel(due, now);
                return (
                  <tr key={r.id}>
                    <td>
                      <a href={`/staff/tickets/${r.id}`}>{r.subject}</a>
                    </td>
                    <td>{r.learner}</td>
                    <td>{CATEGORY_SHORT[r.category]}</td>
                    <td>{r.cohortName ?? "—"}</td>
                    <td>
                      <TicketStatus status={r.status} />
                    </td>
                    <td>
                      {open ? (
                        <span className={`${styles.status} ${label.overdue ? styles.bad : ""}`}>
                          <Icon name={label.overdue ? "warning" : "timer"} size={16} />
                          {label.text}
                          <span className={styles.meta}>&nbsp;({r.firstRespondedAt ? "resolve" : "first reply"})</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{r.assignedTo === actor.userId ? "You" : r.assignedTo ? "Someone else" : "Team queue"}</td>
                    <td>{dateTimeFmt.format(r.createdAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
