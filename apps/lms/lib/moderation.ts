/**
 * Moderation verdicts and sample rules shared by server and UI (design.md §14,
 * 2026-11-08). Stored as moderation_records.outcome + required_actions:
 * Agree = upheld; Agree with actions = upheld + actions; Disagree = referred_back.
 */

export type Verdict = "agree" | "agree_with_actions" | "disagree";

export const VERDICTS: readonly Verdict[] = ["agree", "agree_with_actions", "disagree"];

export const VERDICT_LABEL: Record<Verdict, string> = {
  agree: "Agree",
  agree_with_actions: "Agree with actions",
  disagree: "Disagree",
};

export function verdictOf(m: { outcome: "upheld" | "referred_back"; requiredActions: string | null }): Verdict {
  if (m.outcome === "referred_back") return "disagree";
  return m.requiredActions ? "agree_with_actions" : "agree";
}

/** The minimum sample: the cohort's rate of the batch's decisions, rounded up (same rule as the database). */
export function minimumSample(ratePercent: number, decided: number): number {
  if (decided <= 0) return 0;
  return Math.floor((ratePercent * decided + 99) / 100);
}

/** Where a learner's work stands in the moderation sample. */
export type SampleState =
  | "not_sampled"
  | "to_check" // sampled, current decision not moderated yet
  | "recheck" // the assessor re-decided after a Disagree: check again
  | "agreed"
  | "actions_open" // Agree with actions: waiting for the assessor
  | "actions_done"
  | "disagreed"; // waiting for the assessor to re-decide

export const SAMPLE_STATE_LABEL: Record<SampleState, string> = {
  not_sampled: "–",
  to_check: "Not checked yet",
  recheck: "Re-decided · check again",
  agreed: "✓ Agree",
  actions_open: "• Agree with actions · waiting for the assessor",
  actions_done: "✓ Agree with actions · actions done",
  disagreed: "! Disagree · waiting for the assessor",
};

/** States that count as agreed for release. */
export const isAgreed = (s: SampleState) => s === "agreed" || s === "actions_done";
