import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import ui from "@/components/ui.module.css";
import styles from "@/components/comms/learner.module.css";
import { ExternalLink } from "@/components/comms/learner/ExternalLink";
import { fmtRange } from "@/components/comms/learner/format";
import learn from "@/components/learn/learn.module.css";
import { CommsError } from "@/lib/server/comms";
import { getSessionForViewer } from "@/lib/server/liveSessions";
import { markReadByLink } from "@/lib/server/notify";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Live session" };

const ATTENDANCE: Record<string, string> = {
  present: "You attended",
  late: "You attended (joined late)",
  absent: "Marked absent",
  excused: "Excused",
};

/**
 * One live session (design.md §14, 2026-11-08): Zoom join link (always
 * visible unless cancelled), calendar file, recording afterwards, and the
 * learner's attendance. TODO(copy): wording to be supplied by GRIT Hub.
 */
export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const path = `/sessions/${sessionId}`;
  const { ctx, actor } = await requirePage(path);
  let v;
  try {
    v = await getSessionForViewer(ctx, actor, sessionId);
  } catch (e) {
    if (e instanceof CommsError) notFound();
    throw e;
  }
  await markReadByLink(ctx, actor.userId, path);
  const s = v.session;
  const cancelled = s.cancelledAt !== null;
  const past = s.endsAt < ctx.now();

  return (
    <div className={learn.stack}>
      <p className={learn.crumb}>
        <a href={`/learn/${v.qualificationId}`} className={learn.textLink}>
          Programme
        </a>{" "}
        › Live session
      </p>
      <h1 className={learn.pageTitle}>{s.title}</h1>
      {cancelled ? (
        <p role="status" className={ui.bannerError}>
          This session was cancelled.
        </p>
      ) : null}
      <p className={styles.sessionTitle}>
        <Icon name="session" /> {fmtRange(s.startsAt, s.endsAt)} (South African time) · Zoom
      </p>
      <p className={styles.itemMeta}>
        {v.cohortName}
        {v.module ? ` · ${v.module.code}: ${v.module.title}` : ""}
      </p>
      {s.details ? <p className={styles.postText}>{s.details}</p> : null}

      {!cancelled ? (
        <div className={styles.actions}>
          {!past ? (
            <ExternalLink href={s.joinUrl} className={learn.button}>
              Join on Zoom
            </ExternalLink>
          ) : null}
          {!past ? (
            <a href={`${path}/ics`} className={learn.secondary} download>
              <Icon name="calendar" /> Add to calendar
            </a>
          ) : null}
        </div>
      ) : null}

      {past && !cancelled ? (
        <section aria-labelledby="after" className={styles.section}>
          <h2 id="after" className={styles.sectionTitle}>
            After the session
          </h2>
          {v.attendance ? (
            <p className={v.attendance === "absent" ? styles.warn : styles.ok}>
              <Icon name={v.attendance === "absent" ? "warning" : "done"} size={18} /> {ATTENDANCE[v.attendance]}
            </p>
          ) : null}
          {s.recordingUrl ? (
            <ExternalLink href={s.recordingUrl}>Watch the recording</ExternalLink>
          ) : (
            <p className={styles.hint}>No recording has been added yet.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
