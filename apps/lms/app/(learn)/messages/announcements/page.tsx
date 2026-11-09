import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import styles from "@/components/comms/learner.module.css";
import { fmtDateTime } from "@/components/comms/learner/format";
import learn from "@/components/learn/learn.module.css";
import { listLearnerAnnouncements } from "@/lib/server/announcements";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Announcements" };

/** All announcements for the learner's cohorts, pinned first (L13). */
export default async function AnnouncementsPage() {
  const { ctx, actor } = await requirePage("/messages/announcements");
  const items = await listLearnerAnnouncements(ctx, actor);
  return (
    <div className={learn.stack}>
      <p className={learn.crumb}>
        <a href="/messages" className={learn.textLink}>
          Messages
        </a>{" "}
        › Announcements
      </p>
      <h1 className={learn.pageTitle}>Announcements</h1>
      {items.length === 0 ? (
        // TODO(copy)
        <p className={styles.empty}>No announcements yet. Your facilitator will post news here.</p>
      ) : (
        <ul className={styles.items}>
          {items.map((a) => (
            <li key={a.id} className={styles.item}>
              <a href={`/messages/announcements/${a.id}`} className={styles.itemLink}>
                {a.unread ? <span className={styles.dot} aria-hidden="true" /> : <span className={styles.dotSpace} />}
                <span className={styles.itemBody}>
                  <span className={styles.itemTitle}>
                    {a.unread ? <span className={styles.srOnly}>Unread: </span> : null}
                    {a.title}
                  </span>
                  <span className={styles.itemMeta}>
                    {a.pinnedAt ? (
                      <span className={styles.tag}>
                        <Icon name="pin" size={14} /> Pinned
                      </span>
                    ) : null}{" "}
                    {a.cohortName}
                  </span>
                </span>
                <span className={styles.time}>{a.publishedAt ? fmtDateTime(a.publishedAt) : ""}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
