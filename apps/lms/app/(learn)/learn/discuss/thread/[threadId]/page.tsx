import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { replyAction } from "@/app/(learn)/comms-actions";
import { Icon } from "@/components/Icon";
import styles from "@/components/comms/learner.module.css";
import { Notice } from "@/components/comms/learner/Notice";
import { PostTools } from "@/components/comms/learner/PostTools";
import { fmtDateTime } from "@/components/comms/learner/format";
import learn from "@/components/learn/learn.module.css";
import { CommsError } from "@/lib/server/comms";
import { type ThreadPost, getThread } from "@/lib/server/discussions";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Discussion" };

function Post({ p, back, threadId, nested }: { p: ThreadPost; back: string; threadId: string; nested: boolean }) {
  return (
    <li id={`post-${p.id}`} className={p.mine ? styles.postMine : styles.post}>
      <p className={styles.postHead}>
        <span className={styles.author}>{p.mine ? "You" : p.author}</span>
        {p.authorIsStaff ? <span className={styles.tag}>Facilitator</span> : null}
        <span className={styles.time}>{fmtDateTime(p.createdAt)}</span>
        {p.edited && !p.hidden ? <span className={styles.itemMeta}>(edited)</span> : null}
      </p>
      {p.hidden ? (
        <p className={styles.removed}>
          <Icon name="hide" size={18} /> Removed by a facilitator
        </p>
      ) : (
        <p className={styles.postText}>{p.body}</p>
      )}
      <div className={styles.postTools}>
        <PostTools target={{ kind: "discussion_post", id: p.id }} body={p.body} canEdit={p.canEdit} canReport={p.canReport} back={back} />
        {!nested ? (
          <details className={styles.tool}>
            <summary>
              <Icon name="reply" size={18} /> Reply
            </summary>
            <form action={replyAction} className={styles.toolPanel}>
              <input type="hidden" name="threadId" value={threadId} />
              <input type="hidden" name="parentId" value={p.id} />
              <input type="hidden" name="back" value={back} />
              <label className={styles.field}>
                <span className={styles.label}>Reply to {p.mine ? "your post" : p.author}</span>
                <textarea name="body" className={styles.textarea} required maxLength={5000} />
              </label>
              <div className={styles.actions}>
                <button type="submit" className={learn.secondary}>
                  Post reply
                </button>
              </div>
            </form>
          </details>
        ) : null}
      </div>
      {p.replies.length > 0 ? (
        <ol className={styles.replies} aria-label={`Replies to ${p.author}`}>
          {p.replies.map((r) => (
            <Post key={r.id} p={r} back={back} threadId={threadId} nested />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

/**
 * Discussion thread (L14): the facilitator's opening post, then replies
 * oldest first, nested one level. TODO(copy): wording from GRIT Hub.
 */
export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ threadId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { threadId } = await params;
  const sp = await searchParams;
  const path = `/learn/discuss/thread/${threadId}`;
  const { ctx, actor } = await requirePage(path);
  let data;
  try {
    data = await getThread(ctx, actor, threadId);
  } catch (e) {
    if (e instanceof CommsError) notFound();
    throw e;
  }
  const { thread, posts } = data;
  const total = posts.reduce((n, p) => n + 1 + p.replies.length, 0);

  return (
    <div className={learn.stack}>
      <p className={learn.crumb}>
        <a href={`/learn/${thread.qualificationId}`} className={learn.textLink}>
          Programme
        </a>{" "}
        ›{" "}
        <a href={`/learn/discuss/${thread.moduleId}`} className={learn.textLink}>
          {thread.moduleCode} discussion
        </a>
      </p>
      <h1 className={learn.pageTitle}>{thread.title}</h1>
      <Notice done={sp.done} error={sp.error} />
      <article className={styles.post} aria-label="Opening post">
        <p className={styles.postHead}>
          <span className={styles.author}>{thread.author}</span>
          <span className={styles.tag}>Facilitator</span>
          {thread.pinnedAt ? (
            <span className={styles.tag}>
              <Icon name="pin" size={14} /> Pinned
            </span>
          ) : null}
          <span className={styles.time}>{fmtDateTime(thread.createdAt)}</span>
        </p>
        <p className={styles.postText}>{thread.body}</p>
      </article>

      <h2 className={styles.sectionTitle}>
        {total === 0 ? "No replies yet" : `${total} ${total === 1 ? "reply" : "replies"}`}
      </h2>
      {posts.length > 0 ? (
        <ol className={styles.thread}>
          {posts.map((p) => (
            <Post key={p.id} p={p} back={path} threadId={threadId} nested={false} />
          ))}
        </ol>
      ) : null}

      <form action={replyAction} className={styles.form} id="reply">
        <input type="hidden" name="threadId" value={threadId} />
        <input type="hidden" name="back" value={path} />
        <label className={styles.field}>
          <span className={styles.label}>Add a reply</span>
          <textarea name="body" className={styles.textarea} required maxLength={5000} />
          <span className={styles.hint}>Everyone in your cohort can read this. Be kind, and don&apos;t share personal details.</span>
        </label>
        <div className={styles.actions}>
          <button type="submit" className={learn.button}>
            Post reply
          </button>
        </div>
      </form>
    </div>
  );
}
