/**
 * Question analytics (design-gate decision 2026-11-08, standard defaults).
 * Pure functions over graded responses, so the rules are unit-tested.
 *
 * - Flags apply only with at least MIN_RESPONSES graded responses.
 * - Too easy: >= 90% correct. Too hard: <= 30% correct.
 * - Misleading: one wrong option is chosen more often than the correct one,
 *   or discrimination is negative (learners with a high overall score get it
 *   wrong more often than learners with a low score). Discrimination uses the
 *   upper/lower 27% groups by overall attempt score.
 */

export const FLAG_RULES = {
  minResponses: 20,
  tooEasyAtLeast: 0.9,
  tooHardAtMost: 0.3,
  groupFraction: 0.27,
} as const;

export type StatFlag = "too_easy" | "too_hard" | "misleading";

export type GradedResponse = {
  attemptId: string;
  /** The attempt's overall score as a fraction 0..1 (auto-graded part). */
  attemptScore: number;
  isCorrect: boolean;
  chosenOptionIds: readonly string[];
};

export type VersionStats = {
  responses: number;
  correctRate: number | null;
  discrimination: number | null;
  optionCounts: Map<string, number>;
  flags: StatFlag[];
};

export function versionStats(
  responses: readonly GradedResponse[],
  options: readonly { id: string; isCorrect: boolean }[],
): VersionStats {
  const optionCounts = new Map<string, number>(options.map((o) => [o.id, 0]));
  for (const r of responses) {
    for (const id of r.chosenOptionIds) {
      if (optionCounts.has(id)) optionCounts.set(id, optionCounts.get(id)! + 1);
    }
  }
  const n = responses.length;
  if (n === 0) {
    return {
      responses: 0,
      correctRate: null,
      discrimination: null,
      optionCounts,
      flags: [],
    };
  }
  const correctRate = responses.filter((r) => r.isCorrect).length / n;

  // Upper/lower groups by overall score (ties broken by attempt id: stable).
  const sorted = [...responses].sort(
    (a, b) =>
      a.attemptScore - b.attemptScore ||
      (a.attemptId < b.attemptId ? -1 : a.attemptId > b.attemptId ? 1 : 0),
  );
  const g = Math.max(1, Math.round(n * FLAG_RULES.groupFraction));
  const rate = (rs: GradedResponse[]) =>
    rs.filter((r) => r.isCorrect).length / rs.length;
  const discrimination =
    n >= 2 ? rate(sorted.slice(n - g)) - rate(sorted.slice(0, g)) : null;

  const flags: StatFlag[] = [];
  if (n >= FLAG_RULES.minResponses) {
    if (correctRate >= FLAG_RULES.tooEasyAtLeast) flags.push("too_easy");
    if (correctRate <= FLAG_RULES.tooHardAtMost) flags.push("too_hard");
    const keyCount = Math.max(
      0,
      ...options.filter((o) => o.isCorrect).map((o) => optionCounts.get(o.id)!),
    );
    const distractorBeatsKey = options.some(
      (o) => !o.isCorrect && optionCounts.get(o.id)! > keyCount,
    );
    if (distractorBeatsKey || (discrimination !== null && discrimination < 0)) {
      flags.push("misleading");
    }
  }
  return { responses: n, correctRate, discrimination, optionCounts, flags };
}

export const FLAG_LABELS: Record<StatFlag, string> = {
  too_easy: "Too easy",
  too_hard: "Too hard",
  misleading: "Misleading",
};
