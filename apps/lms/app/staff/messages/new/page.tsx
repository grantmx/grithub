import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { staffStartConversationAction } from "@/app/staff/comms-actions";
import { Icon } from "@/components/Icon";
import styles from "@/components/comms/staff.module.css";
import { StatusBanner } from "@/components/comms/staff/Shared";
import ui from "@/components/ui.module.css";
import { CommsError } from "@/lib/server/comms";
import { staffMessageTarget } from "@/lib/server/messages";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "New message" };
export const dynamic = "force-dynamic";

/** Write to a learner, e.g. from an at-risk flag on Learner progress. */
export default async function NewStaffMessagePage({
  searchParams,
}: {
  searchParams: Promise<{ enrolment?: string; error?: string }>;
}) {
  const { ctx, actor } = await requirePage("/staff/messages/new");
  const sp = await searchParams;
  if (!sp.enrolment) notFound();
  let target;
  try {
    target = await staffMessageTarget(ctx, actor, sp.enrolment);
  } catch (e) {
    if (e instanceof CommsError) notFound();
    throw e;
  }
  const back = `/staff/messages/new?enrolment=${sp.enrolment}`;

  return (
    <div className={styles.page}>
      <p className={ui.hint}>
        <a href="/staff/messages">Messages</a> › New message
      </p>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        Message {target.name}
      </h1>
      <p className={ui.muted}>{target.cohortName} · Only you and the learner can read this conversation.</p>
      <StatusBanner error={sp.error} messages={{}} />
      <form action={staffStartConversationAction} className={styles.form}>
        <input type="hidden" name="enrolmentId" value={sp.enrolment} />
        <input type="hidden" name="back" value={back} />
        <label htmlFor="msg-body" className={ui.label}>
          Your message
        </label>
        {/* TODO(copy): suggested opening line from GRIT Hub. */}
        <textarea id="msg-body" name="body" className={ui.textarea} rows={5} required maxLength={5000} />
        <p className={ui.hint}>Write as you would in person. The learner never sees an &quot;at risk&quot; label.</p>
        <div>
          <button type="submit" className={ui.button}>
            <Icon name="send" size={18} /> Send
          </button>
        </div>
      </form>
    </div>
  );
}
