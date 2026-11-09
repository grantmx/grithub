import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { staffEditMessageAction, staffSendMessageAction } from "@/app/staff/comms-actions";
import { Icon } from "@/components/Icon";
import styles from "@/components/comms/staff.module.css";
import { StatusBanner, longDateTimeFmt } from "@/components/comms/staff/Shared";
import ui from "@/components/ui.module.css";
import { CommsError } from "@/lib/server/comms";
import { getConversation } from "@/lib/server/messages";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Conversation" };
export const dynamic = "force-dynamic";

const DONE = { sent: "Message sent.", edited: "Message updated." };

/** One private conversation, for its staff participant. */
export default async function StaffConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { conversationId } = await params;
  const sp = await searchParams;
  const path = `/staff/messages/${conversationId}`;
  const { ctx, actor } = await requirePage(path);
  let c;
  try {
    c = await getConversation(ctx, actor, conversationId);
  } catch (e) {
    if (e instanceof CommsError) notFound();
    throw e;
  }
  if (c.side !== "staff") notFound();

  return (
    <div className={styles.page}>
      <p className={ui.hint}>
        <a href="/staff/messages">Messages</a> › {c.cohortName}
      </p>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        {c.other.name}
      </h1>
      <p className={ui.muted}>Private: only you and {c.other.name} can read this. It is kept in the cohort&apos;s communication log.</p>
      <StatusBanner done={sp.done} error={sp.error} messages={DONE} />

      <ol className={`${styles.list} ${styles.thread}`} aria-label="Messages">
        {c.messages.map((m) => (
          <li key={m.id} className={`${styles.bubble} ${m.mine ? styles.bubbleMine : ""}`}>
            <div className={styles.itemHead}>
              <strong>{m.mine ? "You" : m.author}</strong>
              <span className={styles.meta}>
                {longDateTimeFmt.format(m.createdAt)}
                {m.edited ? " · edited" : ""}
              </span>
            </div>
            {m.hidden ? (
              <p className={styles.removed}>
                <Icon name="hide" size={16} /> Removed after a report
              </p>
            ) : (
              <p className={styles.body}>{m.body}</p>
            )}
            {m.canEdit ? (
              <details className={styles.details}>
                <summary>Edit (for 15 minutes after sending)</summary>
                <form action={staffEditMessageAction} className={ui.stack}>
                  <input type="hidden" name="messageId" value={m.id} />
                  <input type="hidden" name="back" value={path} />
                  <label htmlFor={`edit-${m.id}`} className={ui.srOnly}>
                    Edit your message
                  </label>
                  <textarea id={`edit-${m.id}`} name="body" className={ui.textarea} rows={3} required maxLength={5000} defaultValue={m.body ?? ""} />
                  <div>
                    <button type="submit" className={ui.secondary}>
                      Save changes
                    </button>
                  </div>
                </form>
              </details>
            ) : null}
          </li>
        ))}
      </ol>

      <form action={staffSendMessageAction} className={styles.form}>
        <input type="hidden" name="conversationId" value={conversationId} />
        <input type="hidden" name="back" value={path} />
        <label htmlFor="msg-body" className={ui.label}>
          Reply
        </label>
        <textarea id="msg-body" name="body" className={ui.textarea} rows={4} required maxLength={5000} />
        <p className={ui.hint}>Text and links only. The learner gets a notification without your message text.</p>
        <div>
          <button type="submit" className={ui.button}>
            <Icon name="send" size={18} /> Send
          </button>
        </div>
      </form>
    </div>
  );
}
