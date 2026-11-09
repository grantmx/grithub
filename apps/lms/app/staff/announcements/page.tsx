import type { Metadata } from "next";
import { pinAnnouncementAction, publishAnnouncementAction } from "@/app/staff/comms-actions";
import { Icon } from "@/components/Icon";
import styles from "@/components/comms/staff.module.css";
import { CohortPicker, NoCohorts, StatusBanner, longDateTimeFmt } from "@/components/comms/staff/Shared";
import ui from "@/components/ui.module.css";
import { ANNOUNCE_ROLES, listCohortAnnouncements } from "@/lib/server/announcements";
import { staffCohorts } from "@/lib/server/comms";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Announcements" };
export const dynamic = "force-dynamic";

// TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
const DONE = {
  published: "Announcement posted. Learners in the cohort have been notified.",
  pinned: "Pinned. It now shows first in Messages and on Home.",
  unpinned: "Unpinned.",
};

/** S3 announcement composer (design.md §14, 2026-11-08): one cohort, publish now, optional pin. */
export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string; done?: string; error?: string }>;
}) {
  const { ctx, actor } = await requirePage("/staff/announcements");
  const sp = await searchParams;
  const cohorts = await staffCohorts(ctx, actor, ANNOUNCE_ROLES);
  const cohort = cohorts.find((c) => c.id === sp.cohort) ?? cohorts[0];
  if (!cohort) return <NoCohorts title="Announcements" />;
  const items = await listCohortAnnouncements(ctx, actor, cohort.id);
  const back = `/staff/announcements?cohort=${cohort.id}`;

  return (
    <div className={styles.page}>
      <CohortPicker title="Announcements" cohorts={cohorts} selected={cohort.id} />
      <StatusBanner done={sp.done} error={sp.error} messages={DONE} />

      <form action={publishAnnouncementAction} className={styles.form}>
        <h2 className={styles.formTitle}>New announcement for {cohort.name}</h2>
        <input type="hidden" name="cohortId" value={cohort.id} />
        <input type="hidden" name="back" value={back} />
        <div className={ui.field}>
          <label htmlFor="ann-title" className={ui.label}>
            Title
          </label>
          <input id="ann-title" name="title" className={ui.input} required maxLength={200} />
        </div>
        <div className={ui.field}>
          <label htmlFor="ann-body" className={ui.label}>
            Message
          </label>
          <textarea id="ann-body" name="body" className={ui.textarea} rows={6} required maxLength={20000} aria-describedby="ann-body-hint" />
          <p id="ann-body-hint" className={ui.hint}>
            You can use the same formatting as section text: headings, lists, links and **bold**.
          </p>
        </div>
        <label className={ui.checkbox}>
          <input type="checkbox" name="pin" value="1" />
          <span>Pin to top. It replaces the current pinned announcement for this cohort.</span>
        </label>
        <p className={ui.hint}>Every learner in the cohort gets a notification, and an email if they have chosen instant emails.</p>
        <div>
          <button type="submit" className={ui.button}>
            Post announcement
          </button>
        </div>
      </form>

      <h2 className={ui.h2} style={{ margin: 0 }}>
        Posted ({items.length})
      </h2>
      {items.length === 0 ? (
        <p className={ui.muted}>No announcements yet for this cohort.</p>
      ) : (
        <ul className={styles.list}>
          {items.map((a) => (
            <li key={a.id} className={styles.item}>
              <div className={styles.itemHead}>
                <h3 className={styles.itemTitle}>{a.title}</h3>
                {a.pinnedAt ? (
                  <span className={styles.tag}>
                    <Icon name="pin" size={16} /> Pinned
                  </span>
                ) : null}
                <span className={styles.meta}>
                  {a.author} · {a.publishedAt ? longDateTimeFmt.format(a.publishedAt) : "Not published"}
                </span>
              </div>
              <p className={styles.body}>{a.body}</p>
              <form action={pinAnnouncementAction} className={styles.actions}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="back" value={back} />
                <input type="hidden" name="pinned" value={a.pinnedAt ? "0" : "1"} />
                <button type="submit" className={ui.textButton}>
                  {a.pinnedAt ? "Unpin" : "Pin to top"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
