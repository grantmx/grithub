import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import styles from "@/components/comms/learner.module.css";
import { fmtDateTime } from "@/components/comms/learner/format";
import learn from "@/components/learn/learn.module.css";
import { CommsError } from "@/lib/server/comms";
import { learnerBoard } from "@/lib/server/discussions";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Discussion" };

/**
 * Module discussion board (L14; design.md §14, 2026-11-08): one board per
 * module per cohort; facilitators start threads, learners reply.
 * TODO(copy): wording to be supplied by GRIT Hub.
 */
export default async function BoardPage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const { ctx, actor } = await requirePage(`/learn/discuss/${moduleId}`);
  let board;
  try {
    board = await learnerBoard(ctx, actor, moduleId);
  } catch (e) {
    if (e instanceof CommsError) notFound();
    throw e;
  }
  return (
    <div className={learn.stack}>
      <p className={learn.crumb}>
        <a href={`/learn/${board.qualificationId}`} className={learn.textLink}>
          Programme
        </a>{" "}
        › {board.module.code}
      </p>
      <h1 className={learn.pageTitle}>Discussion: {board.module.title}</h1>
      <p className={learn.muted}>Ask questions and help each other. Your facilitator starts each topic.</p>
      {board.threads.length === 0 ? (
        <p className={styles.empty}>Your facilitator hasn&apos;t started a discussion yet.</p>
      ) : (
        <ul className={styles.items}>
          {board.threads.map((th) => (
            <li key={th.id} className={styles.item}>
              <a href={`/learn/discuss/thread/${th.id}`} className={styles.itemLink}>
                <Icon name={th.pinnedAt ? "pin" : "messages"} />
                <span className={styles.itemBody}>
                  <span className={styles.itemTitle}>{th.title}</span>
                  <span className={styles.itemMeta}>
                    {th.pinnedAt ? <span className={styles.tag}>Pinned</span> : null} {th.author} · {th.replies}{" "}
                    {th.replies === 1 ? "reply" : "replies"}
                  </span>
                </span>
                <span className={styles.time}>{fmtDateTime(th.lastPostAt)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
