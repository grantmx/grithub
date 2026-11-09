import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { reopenTicketAction, ticketReplyAction } from "@/app/(learn)/comms-actions";
import { Icon } from "@/components/Icon";
import styles from "@/components/comms/learner.module.css";
import { Notice } from "@/components/comms/learner/Notice";
import { fmtDateTime } from "@/components/comms/learner/format";
import learn from "@/components/learn/learn.module.css";
import { CommsError } from "@/lib/server/comms";
import { requirePage } from "@/lib/server/page";
import { CATEGORY_LABEL, STATUS_LABEL, getTicket } from "@/lib/server/tickets";

export const metadata: Metadata = { title: "Help ticket" };

/**
 * One support ticket: the question, replies, a reply form until it is
 * closed, and "Still need help" once resolved. TODO(copy).
 */
export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticketId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { ticketId } = await params;
  const sp = await searchParams;
  const path = `/messages/help/${ticketId}`;
  const { ctx, actor } = await requirePage(path);
  let data;
  try {
    data = await getTicket(ctx, actor, ticketId, "learner");
  } catch (e) {
    if (e instanceof CommsError) notFound();
    throw e;
  }
  const { ticket: tk, replies } = data;
  const finished = tk.status === "resolved" || tk.status === "closed";

  return (
    <div className={learn.stack}>
      <p className={learn.crumb}>
        <a href="/messages" className={learn.textLink}>
          Messages
        </a>{" "}
        › Help
      </p>
      <h1 className={learn.pageTitle}>{tk.subject}</h1>
      <p className={styles.itemMeta}>
        <span className={finished ? styles.ok : undefined}>
          <Icon name={finished ? "done" : "inProgress"} size={18} /> {STATUS_LABEL[tk.status]}
        </span>{" "}
        · {CATEGORY_LABEL[tk.category]}
        {tk.cohortName ? ` · ${tk.cohortName}` : ""}
        {!tk.firstRespondedAt && !finished ? ` · reply due ${fmtDateTime(tk.firstResponseDueAt)}` : ""}
      </p>
      <Notice done={sp.done} error={sp.error} />

      {tk.status === "resolved" ? (
        <form action={reopenTicketAction} className={styles.noteCard}>
          <input type="hidden" name="ticketId" value={tk.id} />
          <input type="hidden" name="back" value={path} />
          <p className={styles.postText}>We think this is sorted. If you still need help, tell us and we&apos;ll reopen it.</p>
          <div className={styles.actions}>
            <button type="submit" className={learn.secondary}>
              Still need help
            </button>
          </div>
        </form>
      ) : null}

      <ol className={styles.thread} aria-label="Ticket history">
        <li className={styles.postMine}>
          <p className={styles.postHead}>
            <span className={styles.author}>You</span>
            <span className={styles.time}>{fmtDateTime(tk.createdAt)}</span>
          </p>
          <p className={styles.postText}>{tk.body}</p>
        </li>
        {replies.map((r) => (
          <li key={r.id} className={r.fromLearner ? styles.postMine : styles.post}>
            <p className={styles.postHead}>
              <span className={styles.author}>{r.fromLearner ? "You" : r.author}</span>
              {!r.fromLearner ? <span className={styles.tag}>Support</span> : null}
              <span className={styles.time}>{fmtDateTime(r.createdAt)}</span>
            </p>
            <p className={styles.postText}>{r.body}</p>
          </li>
        ))}
      </ol>

      {tk.status === "closed" ? (
        <p className={styles.hint}>
          This ticket is closed. If you need more help, <a href="/messages/help/new" className={learn.textLink}>ask a new question</a>.
        </p>
      ) : (
        <form action={ticketReplyAction} className={styles.form}>
          <input type="hidden" name="ticketId" value={tk.id} />
          <input type="hidden" name="back" value={path} />
          <label className={styles.field}>
            <span className={styles.label}>Add a reply</span>
            <textarea name="body" className={styles.textarea} required maxLength={5000} />
            {tk.status === "resolved" ? <span className={styles.hint}>Replying reopens the ticket.</span> : null}
          </label>
          <div className={styles.actions}>
            <button type="submit" className={learn.button}>
              <Icon name="send" /> Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
