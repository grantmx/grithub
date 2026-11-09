import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import styles from "@/components/comms/learner.module.css";
import { fmtWhen } from "@/components/comms/learner/format";
import learn from "@/components/learn/learn.module.css";
import { Markdown } from "@/lib/markdown";
import { getLearnerAnnouncement } from "@/lib/server/announcements";
import { CommsError } from "@/lib/server/comms";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Announcement" };

/** One announcement (L13 detail). Opening it marks its notification read. */
export default async function AnnouncementPage({ params }: { params: Promise<{ announcementId: string }> }) {
  const { announcementId } = await params;
  const { ctx, actor } = await requirePage(`/messages/announcements/${announcementId}`);
  let a;
  try {
    a = await getLearnerAnnouncement(ctx, actor, announcementId);
  } catch (e) {
    if (e instanceof CommsError) notFound();
    throw e;
  }
  return (
    <article className={learn.stack} aria-labelledby="ann-title">
      <p className={learn.crumb}>
        <a href="/messages" className={learn.textLink}>
          Messages
        </a>{" "}
        ›{" "}
        <a href="/messages/announcements" className={learn.textLink}>
          Announcements
        </a>
      </p>
      <h1 id="ann-title" className={learn.pageTitle}>
        {a.title}
      </h1>
      <p className={styles.itemMeta}>
        {a.pinnedAt ? (
          <>
            <span className={styles.tag}>
              <Icon name="pin" size={14} /> Pinned
            </span>{" "}
          </>
        ) : null}
        {a.author} · {a.cohortName} · {a.publishedAt ? fmtWhen(a.publishedAt) : ""}
      </p>
      <div style={{ maxWidth: "var(--measure-reading)" }}>
        <Markdown source={a.body} />
      </div>
    </article>
  );
}
