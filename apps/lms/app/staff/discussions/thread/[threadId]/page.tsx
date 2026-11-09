import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pinThreadAction, staffEditPostAction, staffReplyAction } from "@/app/staff/comms-actions";
import { Icon } from "@/components/Icon";
import styles from "@/components/comms/staff.module.css";
import { StatusBanner, longDateTimeFmt } from "@/components/comms/staff/Shared";
import ui from "@/components/ui.module.css";
import { CommsError } from "@/lib/server/comms";
import { type ThreadPost, getThread } from "@/lib/server/discussions";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Discussion" };
export const dynamic = "force-dynamic";

// TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
const DONE = {
  thread_created: "Discussion started. Learners have been notified.",
  replied: "Reply posted.",
  edited: "Reply updated.",
  pinned: "Pinned to the top of the board.",
  unpinned: "Unpinned.",
};

function Post({ p, threadId, back, nested }: { p: ThreadPost; threadId: string; back: string; nested: boolean }) {
  return (
    <li id={`post-${p.id}`} className={styles.item}>
      <div className={styles.itemHead}>
        <strong>{p.author}</strong>
        {p.authorIsStaff ? <span className={styles.tag}>Staff</span> : null}
        <span className={styles.meta}>
          {longDateTimeFmt.format(p.createdAt)}
          {p.edited ? " · edited" : ""}
        </span>
      </div>
      {p.hidden ? (
        <p className={styles.removed}>
          <Icon name="hide" size={16} /> Removed by a facilitator
        </p>
      ) : (
        <p className={styles.body}>{p.body}</p>
      )}
      <div className={styles.actions}>
        {!nested && !p.hidden ? (
          <details className={styles.details}>
            <summary>Reply to {p.author}</summary>
            <form action={staffReplyAction} className={ui.stack}>
              <input type="hidden" name="threadId" value={threadId} />
              <input type="hidden" name="parentId" value={p.id} />
              <input type="hidden" name="back" value={back} />
              <label htmlFor={`reply-${p.id}`} className={ui.srOnly}>
                Your reply to {p.author}
              </label>
              <textarea id={`reply-${p.id}`} name="body" className={ui.textarea} rows={3} required maxLength={5000} />
              <div>
                <button type="submit" className={ui.button}>
                  Post reply
                </button>
              </div>
            </form>
          </details>
        ) : null}
        {p.canEdit ? (
          <details className={styles.details}>
            <summary>Edit (for 15 minutes after posting)</summary>
            <form action={staffEditPostAction} className={ui.stack}>
              <input type="hidden" name="postId" value={p.id} />
              <input type="hidden" name="back" value={back} />
              <label htmlFor={`edit-${p.id}`} className={ui.srOnly}>
                Edit your reply
              </label>
              <textarea id={`edit-${p.id}`} name="body" className={ui.textarea} rows={3} required maxLength={5000} defaultValue={p.body ?? ""} />
              <p className={ui.hint}>The earlier text is kept in the communication log.</p>
              <div>
                <button type="submit" className={ui.secondary}>
                  Save changes
                </button>
              </div>
            </form>
          </details>
        ) : null}
      </div>
      {p.replies.length > 0 ? (
        <ul className={styles.replies}>
          {p.replies.map((r) => (
            <Post key={r.id} p={r} threadId={threadId} back={back} nested />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Thread view for staff: replies nested one level, pin, reply and edit own (design.md §14, 2026-11-08). */
export default async function StaffThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ threadId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { threadId } = await params;
  const sp = await searchParams;
  const path = `/staff/discussions/thread/${threadId}`;
  const { ctx, actor } = await requirePage(path);
  let data;
  try {
    data = await getThread(ctx, actor, threadId);
  } catch (e) {
    if (e instanceof CommsError) notFound();
    throw e;
  }
  const { thread, posts } = data;

  return (
    <div className={styles.page}>
      <p className={ui.hint}>
        <a href={`/staff/discussions?cohort=${thread.cohortId}`}>Discussions</a> ›{" "}
        <a href={`/staff/discussions/board?cohort=${thread.cohortId}&module=${thread.moduleId}`}>
          {thread.moduleCode} · {thread.cohortName}
        </a>
      </p>
      <div className={styles.toolbar}>
        <h1 className={ui.h1}>{thread.title}</h1>
        {thread.pinnedAt ? (
          <span className={styles.tag}>
            <Icon name="pin" size={16} /> Pinned
          </span>
        ) : null}
        {data.canPin ? (
          <form action={pinThreadAction}>
            <input type="hidden" name="threadId" value={threadId} />
            <input type="hidden" name="pinned" value={thread.pinnedAt ? "0" : "1"} />
            <input type="hidden" name="back" value={path} />
            <button type="submit" className={ui.textButton}>
              {thread.pinnedAt ? "Unpin" : "Pin to top"}
            </button>
          </form>
        ) : null}
      </div>
      <StatusBanner done={sp.done} error={sp.error} messages={DONE} />

      <section className={styles.item} aria-label="Opening post">
        <div className={styles.itemHead}>
          <strong>{thread.author}</strong>
          <span className={styles.tag}>Staff</span>
          <span className={styles.meta}>{longDateTimeFmt.format(thread.createdAt)}</span>
        </div>
        <p className={styles.body}>{thread.body}</p>
      </section>

      <h2 className={ui.h2} style={{ margin: 0 }}>
        Replies
      </h2>
      {posts.length === 0 ? <p className={ui.muted}>No replies yet.</p> : null}
      <ul className={styles.list}>
        {posts.map((p) => (
          <Post key={p.id} p={p} threadId={threadId} back={path} nested={false} />
        ))}
      </ul>

      <form action={staffReplyAction} className={styles.form}>
        <h2 className={styles.formTitle}>Reply to the discussion</h2>
        <input type="hidden" name="threadId" value={threadId} />
        <input type="hidden" name="back" value={path} />
        <label htmlFor="reply-main" className={ui.srOnly}>
          Your reply
        </label>
        <textarea id="reply-main" name="body" className={ui.textarea} rows={4} required maxLength={5000} />
        <div>
          <button type="submit" className={ui.button}>
            Post reply
          </button>
        </div>
      </form>
    </div>
  );
}
