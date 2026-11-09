import { Icon } from "@/components/Icon";
import { editMessageAction, editPostAction, reportAction } from "@/app/(learn)/comms-actions";
import { REASON_LABEL, REPORT_REASONS } from "@/lib/server/contentReports";
import learn from "@/components/learn/learn.module.css";
import styles from "../learner.module.css";

type Target = { kind: "discussion_post" | "direct_message"; id: string };

/** "Edit" (own item, within 15 minutes) and "Report" (someone else's item). Plain details, no pop-ups. */
export function PostTools({
  target,
  body,
  canEdit,
  canReport,
  back,
}: {
  target: Target;
  body: string | null;
  canEdit: boolean;
  canReport: boolean;
  back: string;
}) {
  if (!canEdit && !canReport) return null;
  const idField = target.kind === "discussion_post" ? "postId" : "messageId";
  return (
    <div className={styles.postTools}>
      {canEdit ? (
        <details className={styles.tool}>
          <summary>
            <Icon name="edit" size={18} /> Edit
          </summary>
          <form action={target.kind === "discussion_post" ? editPostAction : editMessageAction} className={styles.toolPanel}>
            <input type="hidden" name={idField} value={target.id} />
            <input type="hidden" name="back" value={back} />
            <label className={styles.field}>
              <span className={styles.label}>Edit your text</span>
              <textarea name="body" className={styles.textarea} defaultValue={body ?? ""} required maxLength={5000} />
            </label>
            {/* TODO(copy) */}
            <p className={styles.hint}>You can edit for 15 minutes after posting.</p>
            <div className={styles.actions}>
              <button type="submit" className={learn.secondary}>
                Save change
              </button>
            </div>
          </form>
        </details>
      ) : null}
      {canReport ? (
        <details className={styles.tool}>
          <summary>
            <Icon name="report" size={18} /> Report
          </summary>
          <form action={reportAction} className={styles.toolPanel}>
            <input type="hidden" name="targetType" value={target.kind} />
            <input type="hidden" name="targetId" value={target.id} />
            <input type="hidden" name="back" value={back} />
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>What&apos;s wrong with it?</legend>
              {REPORT_REASONS.map((r, i) => (
                <label key={r} className={styles.radio}>
                  <input type="radio" name="reason" value={r} required defaultChecked={i === 0} />
                  {REASON_LABEL[r]}
                </label>
              ))}
            </fieldset>
            <label className={styles.field}>
              <span className={styles.label}>Anything else? (optional)</span>
              <textarea name="note" className={styles.textarea} maxLength={500} style={{ minHeight: "4rem" }} />
            </label>
            {/* TODO(copy) */}
            <p className={styles.hint}>Only staff see your report. The person won&apos;t be told who reported it.</p>
            <div className={styles.actions}>
              <button type="submit" className={learn.secondary}>
                Send report
              </button>
            </div>
          </form>
        </details>
      ) : null}
    </div>
  );
}
