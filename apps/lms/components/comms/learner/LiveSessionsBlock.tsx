import { Icon } from "@/components/Icon";
import learn from "@/components/learn/learn.module.css";
import type { learnerSessions } from "@/lib/server/liveSessions";
import styles from "../learner.module.css";
import { ExternalLink } from "./ExternalLink";
import { fmtRange } from "./format";

type Sessions = Awaited<ReturnType<typeof learnerSessions>>;

const ATTENDED: Record<string, { text: string; ok: boolean }> = {
  present: { text: "You attended", ok: true },
  late: { text: "You attended (late)", ok: true },
  absent: { text: "Marked absent", ok: false },
  excused: { text: "Excused", ok: true },
};

/**
 * Programme page "Live sessions" block (design.md §14, 2026-11-08): Upcoming
 * with Join on Zoom and Add to calendar; Past with attendance and the
 * recording. Hidden when there are no sessions. TODO(copy).
 */
export function LiveSessionsBlock({ sessions }: { sessions: Sessions }) {
  if (sessions.upcoming.length === 0 && sessions.past.length === 0) return null;
  return (
    <section className={learn.card} aria-labelledby="live-sessions">
      <h2 id="live-sessions" className={learn.cardTitle}>
        Live sessions
      </h2>
      {sessions.upcoming.length > 0 ? (
        <>
          <h3 className={styles.subhead}>Upcoming</h3>
          <ul className={styles.sessions}>
            {sessions.upcoming.map((s) => (
              <li key={s.id} className={styles.session}>
                <p className={styles.sessionTitle}>
                  <Icon name="session" />
                  <a href={`/sessions/${s.id}`} className={learn.textLink}>
                    {s.title}
                  </a>
                </p>
                <p className={styles.itemMeta}>
                  {fmtRange(s.startsAt, s.endsAt)} · Zoom{s.moduleCode ? ` · ${s.moduleCode}` : ""}
                </p>
                {s.cancelledAt ? (
                  <p className={styles.warn}>
                    <Icon name="warning" size={18} /> Cancelled
                  </p>
                ) : (
                  <div className={styles.actions}>
                    <ExternalLink href={s.joinUrl}>Join on Zoom</ExternalLink>
                    <a href={`/sessions/${s.id}/ics`} className={styles.actionLink} download>
                      <Icon name="calendar" size={18} /> Add to calendar
                    </a>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {sessions.past.length > 0 ? (
        <>
          <h3 className={styles.subhead}>Past</h3>
          <ul className={styles.sessions}>
            {sessions.past.map((s) => {
              const att = s.attendance ? ATTENDED[s.attendance] : null;
              return (
                <li key={s.id} className={styles.session}>
                  <p className={styles.sessionTitle}>
                    <a href={`/sessions/${s.id}`} className={learn.textLink}>
                      {s.title}
                    </a>
                  </p>
                  <p className={styles.itemMeta}>
                    {fmtRange(s.startsAt, s.endsAt)}
                    {s.cancelledAt ? " · Cancelled" : ""}
                  </p>
                  {!s.cancelledAt ? (
                    <div className={styles.actions}>
                      {att ? (
                        <span className={att.ok ? styles.ok : styles.warn}>
                          <Icon name={att.ok ? "done" : "warning"} size={18} /> {att.text}
                        </span>
                      ) : null}
                      {s.recordingUrl ? <ExternalLink href={s.recordingUrl}>Recording</ExternalLink> : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </section>
  );
}
