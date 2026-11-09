import type { Metadata } from "next";
import styles from "@/components/comms/staff.module.css";
import { dateTimeFmt } from "@/components/comms/staff/Shared";
import ui from "@/components/ui.module.css";
import { listStaffConversations } from "@/lib/server/messages";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

/** My private conversations with learners (design.md §14, 2026-11-08). */
export default async function StaffMessagesPage() {
  const { ctx, actor } = await requirePage("/staff/messages");
  const rows = await listStaffConversations(ctx, actor);
  const unread = rows.filter((r) => r.unread).length;

  return (
    <div className={styles.page}>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        Messages
      </h1>
      <p className={ui.muted}>
        Private conversations learners started with you, or you started from Learner progress. Only you and the learner can read them.
        {unread ? ` ${unread} unread.` : ""}
      </p>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th scope="col">Learner</th>
              <th scope="col">Cohort</th>
              <th scope="col">Latest message</th>
              <th scope="col">When</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className={ui.muted}>
                  No messages yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.unread ? (
                      <>
                        <span className={styles.unread} aria-hidden="true" />
                        <span className={ui.srOnly}>Unread: </span>
                      </>
                    ) : null}
                    <a href={`/staff/messages/${r.id}`} style={r.unread ? { fontWeight: "var(--weight-semibold)" } : undefined}>
                      {r.otherName}
                    </a>
                  </td>
                  <td>{r.cohortName}</td>
                  <td>{r.preview ? (r.preview.length > 80 ? `${r.preview.slice(0, 80)}…` : r.preview) : "—"}</td>
                  <td>{dateTimeFmt.format(r.lastMessageAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
