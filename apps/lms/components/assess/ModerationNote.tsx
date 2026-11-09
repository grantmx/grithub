import { completeActionsAction } from "@/app/staff/assess-actions";
import ui from "@/components/ui.module.css";
import { VERDICT_LABEL, verdictOf } from "@/lib/moderation";

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });

export type ModerationNoteRecord = {
  id: string;
  outcome: "upheld" | "referred_back";
  findings: string;
  requiredActions: string | null;
  moderatedAt: Date;
  moderatorName: string;
  completion: { note: string; doneAt: Date } | null;
};

/**
 * One moderation verdict (design.md §14, 2026-11-08): Agree / Agree with
 * actions / Disagree, comments, required actions and the assessor's
 * "Actions done". `actionsForm` shows the Actions done form (the decision's
 * assessor, while the batch is open).
 */
export function ModerationNote({ m, actionsForm, back }: { m: ModerationNoteRecord; actionsForm?: boolean; back?: string }) {
  const verdict = verdictOf(m);
  const cls = verdict === "disagree" ? ui.statusBad : verdict === "agree" ? ui.statusOk : ui.statusWarn;
  return (
    <div className={ui.hint}>
      <div>
        Moderation: <strong className={cls}>{VERDICT_LABEL[verdict]}</strong> by {m.moderatorName}, {dateFmt.format(m.moderatedAt)}
      </div>
      <div>Comments: {m.findings}</div>
      {m.requiredActions ? <div>Required actions: {m.requiredActions}</div> : null}
      {m.completion ? (
        <div className={ui.statusOk}>
          ✓ Actions done {dateFmt.format(m.completion.doneAt)}: {m.completion.note}
        </div>
      ) : verdict === "agree_with_actions" && actionsForm ? (
        <form action={completeActionsAction} className={ui.stack} style={{ marginTop: "0.5rem" }}>
          <input type="hidden" name="moderationRecordId" value={m.id} />
          <input type="hidden" name="back" value={back ?? "/staff/moderation-feedback"} />
          <label htmlFor={`done-${m.id}`} className={ui.label}>
            What did you do?
          </label>
          <textarea id={`done-${m.id}`} name="note" className={ui.input} rows={2} maxLength={2000} required />
          <div>
            <button type="submit" className={ui.secondary}>
              Mark actions done
            </button>
          </div>
        </form>
      ) : verdict === "agree_with_actions" ? (
        <div className={ui.statusWarn}>Waiting for the assessor to finish the actions.</div>
      ) : null}
    </div>
  );
}
