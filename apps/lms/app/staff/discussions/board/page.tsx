import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createThreadAction } from "@/app/staff/comms-actions";
import { Icon } from "@/components/Icon";
import styles from "@/components/comms/staff.module.css";
import { StatusBanner, dateTimeFmt } from "@/components/comms/staff/Shared";
import ui from "@/components/ui.module.css";
import { CommsError } from "@/lib/server/comms";
import { listBoardThreads } from "@/lib/server/discussions";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Discussion board" };
export const dynamic = "force-dynamic";

/** One module's board for one cohort: threads (pinned first) and "Start a discussion". */
export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string; module?: string; error?: string; done?: string }>;
}) {
  const { ctx, actor } = await requirePage("/staff/discussions/board");
  const sp = await searchParams;
  if (!sp.cohort || !sp.module) notFound();
  let data;
  try {
    data = await listBoardThreads(ctx, actor, sp.cohort, sp.module);
  } catch (e) {
    if (e instanceof CommsError) notFound();
    throw e;
  }
  const back = `/staff/discussions/board?cohort=${sp.cohort}&module=${sp.module}`;

  return (
    <div className={styles.page}>
      <p className={ui.hint}>
        <a href={`/staff/discussions?cohort=${sp.cohort}`}>Discussions</a> › {data.module.cohortName}
      </p>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        {data.module.code}: {data.module.title}
      </h1>
      <StatusBanner done={sp.done} error={sp.error} messages={{}} />

      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th scope="col">Discussion</th>
              <th scope="col">Started by</th>
              <th scope="col">Replies</th>
              <th scope="col">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {data.threads.length === 0 ? (
              <tr>
                <td colSpan={4} className={ui.muted}>
                  No discussions yet. Start one below.
                </td>
              </tr>
            ) : (
              data.threads.map((t) => (
                <tr key={t.id}>
                  <td>
                    {t.pinnedAt ? (
                      <span className={styles.tag} style={{ marginRight: "var(--space-2)" }}>
                        <Icon name="pin" size={14} /> Pinned
                      </span>
                    ) : null}
                    <a href={`/staff/discussions/thread/${t.id}`}>{t.title}</a>
                  </td>
                  <td>{t.author}</td>
                  <td>{t.replies}</td>
                  <td>{dateTimeFmt.format(t.lastPostAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form action={createThreadAction} className={styles.form}>
        <h2 className={styles.formTitle}>Start a discussion</h2>
        <input type="hidden" name="cohortId" value={sp.cohort} />
        <input type="hidden" name="moduleId" value={sp.module} />
        <input type="hidden" name="back" value={back} />
        <div className={ui.field}>
          <label htmlFor="th-title" className={ui.label}>
            Title
          </label>
          <input id="th-title" name="title" className={ui.input} required maxLength={200} />
        </div>
        <div className={ui.field}>
          <label htmlFor="th-body" className={ui.label}>
            Opening post
          </label>
          <textarea id="th-body" name="body" className={ui.textarea} rows={5} required maxLength={5000} />
        </div>
        <p className={ui.hint}>Learners in the cohort are notified. Text and links only.</p>
        <div>
          <button type="submit" className={ui.button}>
            Start discussion
          </button>
        </div>
      </form>
    </div>
  );
}
