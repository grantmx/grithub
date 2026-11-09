import type { Metadata } from "next";
import { raiseTicketAction } from "@/app/(learn)/comms-actions";
import { Icon } from "@/components/Icon";
import styles from "@/components/comms/learner.module.css";
import { Notice } from "@/components/comms/learner/Notice";
import learn from "@/components/learn/learn.module.css";
import { learnerCohorts } from "@/lib/server/comms";
import { requirePage } from "@/lib/server/page";
import { CATEGORY_LABEL, TICKET_CATEGORIES } from "@/lib/server/tickets";

export const metadata: Metadata = { title: "Ask for help" };

/**
 * Raise a support ticket (design.md §14, 2026-11-08): first reply within
 * 1 working day. TODO(copy): wording to be supplied by GRIT Hub.
 */
export default async function NewTicketPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { ctx, actor } = await requirePage("/messages/help/new");
  const sp = await searchParams;
  const cohorts = await learnerCohorts(ctx, actor.userId);
  return (
    <div className={learn.stack}>
      <p className={learn.crumb}>
        <a href="/messages" className={learn.textLink}>
          Messages
        </a>{" "}
        › Ask for help
      </p>
      <h1 className={learn.pageTitle}>Ask for help</h1>
      <p className={learn.muted}>We reply within 1 working day (Monday to Friday, 08:00–17:00).</p>
      <Notice error={sp.error} />
      <form action={raiseTicketAction} className={styles.form}>
        <input type="hidden" name="back" value="/messages/help/new" />
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>What do you need help with?</legend>
          {TICKET_CATEGORIES.map((c, i) => (
            <label key={c} className={styles.radio}>
              <input type="radio" name="category" value={c} required defaultChecked={i === 0} />
              {CATEGORY_LABEL[c]}
            </label>
          ))}
        </fieldset>
        {cohorts.length > 1 ? (
          <label className={styles.field}>
            <span className={styles.label}>Which programme is this about?</span>
            <select name="cohortId" className={styles.select} defaultValue="">
              <option value="">Choose a programme</option>
              {cohorts.map((c) => (
                <option key={c.cohortId} value={c.cohortId}>
                  {c.cohortName}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className={styles.field}>
          <span className={styles.label}>Subject</span>
          <input name="subject" className={styles.input} required maxLength={200} />
          <span className={styles.hint}>A few words, like &quot;Can&apos;t open Section 4&quot;.</span>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Your question</span>
          <textarea name="body" className={styles.textarea} required maxLength={5000} />
          <span className={styles.hint}>Tell us what happened and what you&apos;ve tried. Please don&apos;t share your ID number or passwords.</span>
        </label>
        <div className={styles.actions}>
          <button type="submit" className={learn.button}>
            <Icon name="send" /> Send
          </button>
        </div>
      </form>
    </div>
  );
}
