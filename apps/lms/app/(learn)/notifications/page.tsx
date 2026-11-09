import type { Metadata } from "next";
import { markAllReadAction } from "@/app/(learn)/comms-actions";
import { Icon } from "@/components/Icon";
import type { IconName } from "@/components/icons.generated";
import styles from "@/components/comms/learner.module.css";
import { Notice } from "@/components/comms/learner/Notice";
import { fmtDateTime } from "@/components/comms/learner/format";
import learn from "@/components/learn/learn.module.css";
import { listNotifications } from "@/lib/server/notify";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Notifications" };

const KIND_ICON: Record<string, IconName> = {
  announcement: "messages",
  discussion: "reply",
  message: "messages",
  ticket: "help",
  session: "session",
};

/** In-app notifications (L19): newest first, unread marked, each links to its item. */
export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const { ctx, actor } = await requirePage("/notifications");
  const sp = await searchParams;
  const items = await listNotifications(ctx, actor);
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <div className={learn.stack}>
      <div className={styles.sectionHead}>
        <h1 className={learn.pageTitle}>Notifications</h1>
        {unread > 0 ? (
          <form action={markAllReadAction}>
            <button type="submit" className={learn.secondary}>
              Mark all as read
            </button>
          </form>
        ) : null}
      </div>
      <Notice done={sp.done} />
      <p className={styles.hint}>
        {unread > 0 ? `${unread} unread. ` : ""}
        <a href="/account/notifications" className={learn.textLink}>
          Choose which emails you get
        </a>
      </p>
      {items.length === 0 ? (
        // TODO(copy)
        <p className={styles.empty}>Nothing new. Announcements, replies and updates will show here.</p>
      ) : (
        <ul className={styles.items}>
          {items.map((n) => (
            <li key={n.id} className={styles.item}>
              <a href={`/notifications/${n.id}`} className={styles.itemLink}>
                {n.readAt ? <span className={styles.dotSpace} /> : <span className={styles.dot} aria-hidden="true" />}
                <Icon name={KIND_ICON[n.kind] ?? "note"} />
                <span className={styles.itemBody}>
                  <span className={n.readAt ? undefined : styles.itemTitle} style={n.readAt ? { color: "var(--color-accent)" } : undefined}>
                    {n.readAt ? null : <span className={styles.srOnly}>Unread: </span>}
                    {n.title}
                  </span>
                </span>
                <span className={styles.time}>{fmtDateTime(n.createdAt)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
