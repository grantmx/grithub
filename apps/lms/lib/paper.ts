import {
  type OrderableOption,
  orderOptions,
  rngFromSeed,
  shuffle,
  type Rng,
} from "./randomization";

/**
 * Blueprint paper draw (docs/lms/randomization.md §2–5). Pure and
 * deterministic: the same seed, rules and history always give the same paper.
 *
 *   for each rule (sorted by rule id), draw `count` questions from its bank:
 *     unseen questions first (seeded sample), then least-recently-seen;
 *   shuffle the whole paper's question order;
 *   shuffle each question's options, keeping pinned options in place.
 *
 * Every paper therefore has exactly `count` questions per curriculum
 * component (equal coverage), while the questions and order differ per
 * learner and attempt. The result is persisted as attempt_items, which always
 * win over a re-draw.
 */

export type DrawQuestion<O extends OrderableOption = OrderableOption> = {
  questionId: string;
  versionId: string;
  options: readonly O[];
};

export type DrawRule<O extends OrderableOption = OrderableOption> = {
  ruleId: string;
  component: string;
  count: number;
  questions: readonly DrawQuestion<O>[];
};

export type DrawnItem<O extends OrderableOption = OrderableOption> = {
  ruleId: string;
  component: string;
  questionId: string;
  versionId: string;
  /** 1-based position on the paper. */
  position: number;
  options: O[];
};

export type DrawnPaper<O extends OrderableOption = OrderableOption> = {
  items: DrawnItem<O>[];
  /** True when some rule ran out of unseen questions (randomization.md §4.5). */
  usedFallback: boolean;
};

export class PoolTooSmallError extends Error {
  constructor(
    public readonly ruleId: string,
    public readonly needed: number,
    public readonly available: number,
  ) {
    super(
      `Rule ${ruleId} needs ${needed} questions but only ${available} are available`,
    );
    this.name = "PoolTooSmallError";
  }
}

/** Choose `count` ids: unseen first (seeded), then least-recently-seen (seeded tie-break). */
export function chooseQuestions(
  ids: readonly string[],
  count: number,
  lastSeen: ReadonlyMap<string, number>,
  rng: Rng,
): { chosen: string[]; usedFallback: boolean } {
  const sorted = [...new Set(ids)].sort(); // stable base order, independent of DB order
  const unseen = shuffle(
    sorted.filter((q) => !lastSeen.has(q)),
    rng,
  );
  if (unseen.length >= count) {
    return { chosen: unseen.slice(0, count), usedFallback: false };
  }
  // Seeded shuffle first, then a stable sort by last-seen attempt: ties keep
  // their seeded order.
  const seen = shuffle(
    sorted.filter((q) => lastSeen.has(q)),
    rng,
  ).sort((a, b) => lastSeen.get(a)! - lastSeen.get(b)!);
  return {
    chosen: [...unseen, ...seen.slice(0, count - unseen.length)],
    usedFallback: true,
  };
}

export function drawPaper<O extends OrderableOption>(input: {
  seed: string;
  rules: readonly DrawRule<O>[];
  /** Question id → most recent attempt number it was served to this learner (this blueprint). */
  lastSeen?: ReadonlyMap<string, number>;
}): DrawnPaper<O> {
  const rng = rngFromSeed(input.seed);
  const lastSeen = input.lastSeen ?? new Map<string, number>();
  const rules = [...input.rules].sort((a, b) =>
    a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0,
  );

  let usedFallback = false;
  const picked: Omit<DrawnItem<O>, "position" | "options">[] = [];
  const byQuestion = new Map<string, DrawQuestion<O>>();
  const taken = new Set<string>();
  for (const rule of rules) {
    // A question can only appear once per paper, even if banks overlapped.
    const pool = rule.questions.filter((q) => !taken.has(q.questionId));
    if (pool.length < rule.count) {
      throw new PoolTooSmallError(rule.ruleId, rule.count, pool.length);
    }
    for (const q of pool) byQuestion.set(q.questionId, q);
    const { chosen, usedFallback: fb } = chooseQuestions(
      pool.map((q) => q.questionId),
      rule.count,
      lastSeen,
      rng,
    );
    usedFallback ||= fb;
    for (const questionId of chosen) {
      taken.add(questionId);
      picked.push({
        ruleId: rule.ruleId,
        component: rule.component,
        questionId,
        versionId: byQuestion.get(questionId)!.versionId,
      });
    }
  }

  const ordered = shuffle(picked, rng);
  const items = ordered.map((p, i) => ({
    ...p,
    position: i + 1,
    options: orderOptions(byQuestion.get(p.questionId)!.options, rng),
  }));
  return { items, usedFallback };
}

/** Questions per component on a paper (for coverage checks). */
export function coverageOf(
  items: readonly Pick<DrawnItem, "component">[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) m.set(it.component, (m.get(it.component) ?? 0) + 1);
  return m;
}
