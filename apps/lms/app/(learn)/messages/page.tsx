import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import styles from "@/components/comms/learner.module.css";
import { Notice } from "@/components/comms/learner/Notice";
import { fmtDateTime } from "@/components/comms/learner/format";
import learn from "@/components/learn/learn.module.css";
import { listLearnerAnnouncements } from "@/lib/server/announcements";
import { listLearnerConversations } from "@/lib/server/messages";
import { requirePage } from "@/lib/server/page";
import { STATUS_LABEL, listMyTickets } from "@/lib/server/tickets";

export const metadata: Metadata = { title: "Messages" };

const ROLE: Record<string, string> = { facilitator: "facilitator", assessor: "assessor" };

/**
 * Messages tab (design.md §14, 2026-11-08): Announcements, Conversations and
 * Help as three stacked sections on one page, newest first, unread dots.
 * TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
 */
export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const { ctx, actor } = await requirePage("/messages");
  const sp = await searchParams;
  const [announcements, conversations, tickets] = await Promise.all([
    listLearnerAnnouncements(ctx, actor, 4),
    listLearnerConversations(ctx, actor),
    listMyTickets(ctx, actor),
  ]);

  return (
    <div className={learn.stack}>
      <h1 className={learn.pageTitle}>Messages</h1>
      <Notice done={sp.done} error={sp.error} />

      <section aria-labelledby="ann" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 id="ann" className={styles.sectionTitle}>
            Announcements
          </h2>
          {announcements.length > 0 ? (
            <a href="/messages/announcements" className={styles.actionLink}>
              See all <span aria-hidden="true">›</span>
            </a>
          ) : null}
        </div>
        {announcements.length === 0 ? (
          <p className={styles.empty}>No announcements yet.</p>
        ) : (
          <ul className={styles.items}>
            {announcements.map((a) => (
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
      </section>

      <section aria-labelledby="conv" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 id="conv" className={styles.sectionTitle}>
            Conversations
          </h2>
          <a href="/messages/new" className={learn.secondary}>
            <Icon name="send" /> New message
          </a>
        </div>
        {conversations.length === 0 ? (
          <p className={styles.empty}>You can send a private message to your facilitator or assessor.</p>
        ) : (
          <ul className={styles.items}>
            {conversations.map((c) => (
              <li key={c.id} className={styles.item}>
                <a href={`/messages/c/${c.id}`} className={styles.itemLink}>
                  {c.unread ? <span className={styles.dot} aria-hidden="true" /> : <span className={styles.dotSpace} />}
                  <span className={styles.itemBody}>
                    <span className={styles.itemTitle}>
                      {c.unread ? <span className={styles.srOnly}>Unread: </span> : null}
                      {c.otherName} <span className={styles.itemMeta}>({ROLE[c.role] ?? c.role})</span>
                    </span>
                    {c.preview ? <span className={styles.preview}>{c.preview}</span> : null}
                  </span>
                  <span className={styles.time}>{fmtDateTime(c.lastMessageAt)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="help" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 id="help" className={styles.sectionTitle}>
            Help
          </h2>
          <a href="/messages/help/new" className={learn.secondary}>
            <Icon name="help" /> Ask for help
          </a>
        </div>
        {tickets.length === 0 ? (
          <p className={styles.empty}>Stuck with your learning, or something isn&apos;t working? Ask for help and we&apos;ll reply within 1 working day.</p>
        ) : (
          <ul className={styles.items}>
            {tickets.map((tk) => {
              const waiting = !tk.firstRespondedAt && (tk.status === "open" || tk.status === "in_progress");
              return (
                <li key={tk.id} className={styles.item}>
                  <a href={`/messages/help/${tk.id}`} className={styles.itemLink}>
                    {tk.unread ? <span className={styles.dot} aria-hidden="true" /> : <span className={styles.dotSpace} />}
                    <span className={styles.itemBody}>
                      <span className={styles.itemTitle}>
                        {tk.unread ? <span className={styles.srOnly}>Unread: </span> : null}
                        {tk.subject}
                      </span>
                      <span className={styles.itemMeta}>
                        <Icon name={tk.status === "resolved" || tk.status === "closed" ? "done" : "inProgress"} size={16} />{" "}
                        {STATUS_LABEL[tk.status]}
                        {waiting ? ` · reply due ${fmtDateTime(tk.firstResponseDueAt)}` : ""}
                      </span>
                    </span>
                    <span className={styles.time}>{fmtDateTime(tk.lastActivityAt)}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
        <p className={styles.hint}>
          Can&apos;t sign in on another device? <a href="/signin/help" className={learn.textLink}>Help signing in</a>
        </p>
      </section>
    </div>
  );
}
