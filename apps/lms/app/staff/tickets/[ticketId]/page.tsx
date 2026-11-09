import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ticketReassignAction, ticketReplyAction, ticketStatusAction } from "@/app/staff/comms-actions";
import { Icon } from "@/components/Icon";
import styles from "@/components/comms/staff.module.css";
import { StatusBanner, longDateTimeFmt } from "@/components/comms/staff/Shared";
import { TicketStatus } from "@/components/comms/staff/TicketStatus";
import ui from "@/components/ui.module.css";
import { CommsError } from "@/lib/server/comms";
import { requirePage } from "@/lib/server/page";
import { CATEGORY_LABEL, getTicket } from "@/lib/server/tickets";
import { dueLabel } from "@/lib/workingTime";

export const metadata: Metadata = { title: "Support ticket" };
export const dynamic = "force-dynamic";

// TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
const DONE = {
  replied: "Reply sent. The learner has been notified.",
  status_in_progress: "Marked in progress.",
  status_resolved: "Marked resolved. The learner can reopen it until it is closed.",
  status_closed: "Ticket closed.",
  reassigned: "Ticket reassigned.",
};

/** One support ticket for its handlers: replies, status and reassignment. */
export default async function StaffTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticketId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { ticketId } = await params;
  const sp = await searchParams;
  const path = `/staff/tickets/${ticketId}`;
  const { ctx, actor } = await requirePage(path);
  let data;
  try {
    data = await getTicket(ctx, actor, ticketId, "staff");
  } catch (e) {
    if (e instanceof CommsError) notFound();
    throw e;
  }
  const { ticket: t, replies, assignees } = data;
  const now = ctx.now();
  const closed = t.status === "closed";
  const firstDue = dueLabel(t.firstResponseDueAt, now);
  const resolveDue = dueLabel(t.resolveDueAt, now);

  return (
    <div className={styles.page}>
      <p className={ui.hint}>
        <a href="/staff/tickets">Support tickets</a> › {t.subject}
      </p>
      <div className={styles.toolbar}>
        <h1 className={ui.h1}>{t.subject}</h1>
        <TicketStatus status={t.status} />
        {t.overdue ? (
          <span className={`${styles.status} ${styles.bad}`}>
            <Icon name="warning" size={16} /> Overdue ({t.overdue === "first_reply" ? "first reply" : "resolution"})
          </span>
        ) : null}
      </div>
      <p className={styles.meta}>
        {t.raisedByName} · {CATEGORY_LABEL[t.category]}
        {t.cohortName ? ` · ${t.cohortName}` : ""} · raised {longDateTimeFmt.format(t.createdAt)}
      </p>
      <p className={styles.meta}>
        First reply:{" "}
        {t.firstRespondedAt
          ? `sent ${longDateTimeFmt.format(t.firstRespondedAt)}`
          : `${firstDue.text} (${longDateTimeFmt.format(t.firstResponseDueAt)})`}{" "}
        · Resolve:{" "}
        {t.resolvedAt ? `done ${longDateTimeFmt.format(t.resolvedAt)}` : `${resolveDue.text} (${longDateTimeFmt.format(t.resolveDueAt)})`}
      </p>
      <StatusBanner done={sp.done} error={sp.error} messages={DONE} />

      <ol className={`${styles.list} ${styles.thread}`} aria-label="Ticket conversation">
        <li className={styles.bubble}>
          <div className={styles.itemHead}>
            <strong>{t.raisedByName}</strong>
            <span className={styles.tag}>Learner</span>
            <span className={styles.meta}>{longDateTimeFmt.format(t.createdAt)}</span>
          </div>
          <p className={styles.body}>{t.body}</p>
        </li>
        {replies.map((r) => (
          <li key={r.id} className={`${styles.bubble} ${r.fromLearner ? "" : styles.bubbleMine}`}>
            <div className={styles.itemHead}>
              <strong>{r.authorId === actor.userId ? "You" : r.author}</strong>
              <span className={styles.tag}>{r.fromLearner ? "Learner" : "Staff"}</span>
              <span className={styles.meta}>{longDateTimeFmt.format(r.createdAt)}</span>
            </div>
            <p className={styles.body}>{r.body}</p>
          </li>
        ))}
      </ol>

      {closed ? (
        <p className={ui.bannerInfo}>This ticket is closed. The learner can raise a new one if they still need help.</p>
      ) : (
        <>
          <form action={ticketReplyAction} className={styles.form}>
            <input type="hidden" name="ticketId" value={ticketId} />
            <input type="hidden" name="back" value={path} />
            <label htmlFor="t-reply" className={ui.label}>
              Reply to the learner
            </label>
            <textarea id="t-reply" name="body" className={ui.textarea} rows={4} required maxLength={5000} />
            <p className={ui.hint}>Your first reply stops the first-reply clock and marks the ticket in progress.</p>
            <div>
              <button type="submit" className={ui.button}>
                Send reply
              </button>
            </div>
          </form>

          <div className={styles.form}>
            <h2 className={styles.formTitle}>Status</h2>
            <div className={styles.actions}>
              {t.status !== "in_progress" ? (
                <form action={ticketStatusAction}>
                  <input type="hidden" name="ticketId" value={ticketId} />
                  <input type="hidden" name="back" value={path} />
                  <button type="submit" name="status" value="in_progress" className={ui.secondary}>
                    Mark in progress
                  </button>
                </form>
              ) : null}
              {t.status !== "resolved" ? (
                <form action={ticketStatusAction}>
                  <input type="hidden" name="ticketId" value={ticketId} />
                  <input type="hidden" name="back" value={path} />
                  <button type="submit" name="status" value="resolved" className={ui.secondary}>
                    Mark resolved
                  </button>
                </form>
              ) : null}
            </div>
            <form action={ticketStatusAction} className={ui.stack}>
              <input type="hidden" name="ticketId" value={ticketId} />
              <input type="hidden" name="back" value={path} />
              <input type="hidden" name="status" value="closed" />
              <label className={ui.checkbox}>
                <input type="checkbox" name="confirm" value="1" required />
                <span>Close this ticket. The learner can no longer reply or reopen it.</span>
              </label>
              <div>
                <button type="submit" className={ui.secondary}>
                  Close ticket
                </button>
              </div>
            </form>
          </div>

          <form action={ticketReassignAction} className={styles.form}>
            <h2 className={styles.formTitle}>Assign</h2>
            <input type="hidden" name="ticketId" value={ticketId} />
            <input type="hidden" name="back" value={path} />
            <label htmlFor="t-assign" className={ui.label}>
              Handled by
            </label>
            <select id="t-assign" name="assigneeId" className={ui.select} defaultValue={t.assignedTo ?? ""}>
              <option value="">{t.category === "academic" ? "The cohort's facilitators (team queue)" : "SDP admins (team queue)"}</option>
              {assignees.map((a) => (
                <option key={a.userId} value={a.userId}>
                  {a.name}
                </option>
              ))}
            </select>
            <div>
              <button type="submit" className={ui.secondary}>
                Save
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
