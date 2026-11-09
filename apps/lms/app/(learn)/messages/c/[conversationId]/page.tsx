import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sendMessageAction } from "@/app/(learn)/comms-actions";
import { Icon } from "@/components/Icon";
import styles from "@/components/comms/learner.module.css";
import { Notice } from "@/components/comms/learner/Notice";
import { PostTools } from "@/components/comms/learner/PostTools";
import { fmtDateTime } from "@/components/comms/learner/format";
import learn from "@/components/learn/learn.module.css";
import { CommsError } from "@/lib/server/comms";
import { getConversation } from "@/lib/server/messages";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Conversation" };

/**
 * A private conversation with a facilitator or assessor, oldest first. Own
 * messages can be edited for 15 minutes; received ones can be reported.
 * TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
 */
export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { conversationId } = await params;
  const sp = await searchParams;
  const path = `/messages/c/${conversationId}`;
  const { ctx, actor } = await requirePage(path);
  let c;
  try {
    c = await getConversation(ctx, actor, conversationId);
  } catch (e) {
    if (e instanceof CommsError) notFound();
    throw e;
  }

  return (
    <div className={learn.stack}>
      <p className={learn.crumb}>
        <a href="/messages" className={learn.textLink}>
          Messages
        </a>{" "}
        › Conversation
      </p>
      <h1 className={learn.pageTitle}>
        {c.other.name} <span className={styles.itemMeta}>({c.other.role})</span>
      </h1>
      <p className={styles.hint}>
        {c.cohortName} · Private: only you and {c.other.name} can read this.
      </p>
      <Notice done={sp.done} error={sp.error} />

      <ol className={styles.thread} aria-label="Messages">
        {c.messages.map((m) => (
          <li key={m.id} id={`msg-${m.id}`} className={m.mine ? styles.postMine : styles.post}>
            <p className={styles.postHead}>
              <span className={styles.author}>{m.mine ? "You" : m.author}</span>
              <span className={styles.time}>{fmtDateTime(m.createdAt)}</span>
              {m.edited ? <span className={styles.itemMeta}>(edited)</span> : null}
            </p>
            {m.hidden ? (
              <p className={styles.removed}>
                <Icon name="hide" size={18} /> This message was removed.
              </p>
            ) : (
              <p className={styles.postText}>{m.body}</p>
            )}
            <PostTools target={{ kind: "direct_message", id: m.id }} body={m.body} canEdit={m.canEdit} canReport={m.canReport} back={path} />
          </li>
        ))}
      </ol>

      <form action={sendMessageAction} className={styles.form}>
        <input type="hidden" name="conversationId" value={c.id} />
        <input type="hidden" name="back" value={path} />
        <label className={styles.field}>
          <span className={styles.label}>Reply</span>
          <textarea name="body" className={styles.textarea} required maxLength={5000} />
        </label>
        <div className={styles.actions}>
          <button type="submit" className={learn.button}>
            <Icon name="send" /> Send
          </button>
        </div>
      </form>
    </div>
  );
}
