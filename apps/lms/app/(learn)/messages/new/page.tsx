import type { Metadata } from "next";
import { startConversationAction } from "@/app/(learn)/comms-actions";
import { Icon } from "@/components/Icon";
import styles from "@/components/comms/learner.module.css";
import { Notice } from "@/components/comms/learner/Notice";
import learn from "@/components/learn/learn.module.css";
import { messageRecipients } from "@/lib/server/messages";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "New message" };

/**
 * New private message: the learner picks one named facilitator or the
 * cohort's assessor (design.md §14, 2026-11-08). Text and links only.
 * TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
 */
export default async function NewMessagePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { ctx, actor } = await requirePage("/messages/new");
  const sp = await searchParams;
  const people = await messageRecipients(ctx, actor);
  const cohorts = [...new Map(people.map((p) => [p.cohortId, p.cohortName])).entries()];

  return (
    <div className={learn.stack}>
      <p className={learn.crumb}>
        <a href="/messages" className={learn.textLink}>
          Messages
        </a>{" "}
        › New message
      </p>
      <h1 className={learn.pageTitle}>New message</h1>
      <Notice error={sp.error} />
      {people.length === 0 ? (
        <p className={styles.empty}>
          There&apos;s nobody to message yet. Once you&apos;re in a cohort with a facilitator, you can write to them here. If you need help now,{" "}
          <a href="/messages/help/new" className={learn.textLink}>
            ask for help
          </a>
          .
        </p>
      ) : (
        <form action={startConversationAction} className={styles.form}>
          <input type="hidden" name="back" value="/messages/new" />
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Who do you want to write to?</legend>
            {cohorts.map(([cohortId, cohortName]) => (
              <div key={cohortId} role="group" aria-label={cohortName}>
                {cohorts.length > 1 ? <p className={styles.groupLabel}>{cohortName}</p> : null}
                {people
                  .filter((p) => p.cohortId === cohortId)
                  .map((p, i) => (
                    <label key={`${p.cohortId}:${p.userId}`} className={styles.radio}>
                      <input
                        type="radio"
                        name="recipient"
                        value={`${p.cohortId}:${p.userId}`}
                        required
                        defaultChecked={people.length === 1 && i === 0}
                      />
                      {p.name} · {p.role}
                    </label>
                  ))}
              </div>
            ))}
          </fieldset>
          <label className={styles.field}>
            <span className={styles.label}>Your message</span>
            <textarea name="body" className={styles.textarea} required maxLength={5000} />
            <span className={styles.hint}>Only the person you choose can read it. You can add links, but not files.</span>
          </label>
          <div className={styles.actions}>
            <button type="submit" className={learn.button}>
              <Icon name="send" /> Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
