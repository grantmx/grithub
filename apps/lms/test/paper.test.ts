import { describe, expect, it } from "vitest";
import {
  chooseQuestions,
  coverageOf,
  drawPaper,
  PoolTooSmallError,
  type DrawRule,
} from "@/lib/paper";
import { rngFromSeed, seedFor } from "@/lib/randomization";

/**
 * Blueprint paper draw (randomization.md §2–5). Pure tests: determinism,
 * golden output, uniqueness across a seeded cohort, equal coverage, pins and
 * retries.
 */

const BLUEPRINT = "00000000-0000-4000-8000-0000000000b1";
const learner = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;

function bank(component: string, size: number, pinLast = true): DrawRule["questions"] {
  return Array.from({ length: size }, (_, i) => ({
    questionId: `${component}-q${String(i + 1).padStart(2, "0")}`,
    versionId: `${component}-q${String(i + 1).padStart(2, "0")}-v1`,
    options: Array.from({ length: 4 }, (_, j) => ({
      id: `${component}-q${i + 1}-o${j + 1}`,
      authorOrder: j + 1,
      pinnedPosition: pinLast && j === 3 ? -1 : null,
    })),
  }));
}

const RULES: DrawRule[] = [
  { ruleId: "r1", component: "KT01", count: 4, questions: bank("KT01", 12) },
  { ruleId: "r2", component: "KT02", count: 3, questions: bank("KT02", 10) },
  { ruleId: "r3", component: "KT03", count: 3, questions: bank("KT03", 10) },
];

const paperFor = (i: number, attempt = 1, lastSeen?: Map<string, number>) =>
  drawPaper({ seed: seedFor(learner(i), BLUEPRINT, attempt), rules: RULES, lastSeen });

const signature = (p: ReturnType<typeof paperFor>) =>
  p.items.map((it) => `${it.questionId}:${it.options.map((o) => o.id.slice(-2)).join("")}`).join("|");

describe("blueprint paper draw", () => {
  it("is deterministic per learner, assessment and attempt", () => {
    expect(signature(paperFor(1))).toBe(signature(paperFor(1)));
    expect(signature(paperFor(1, 2))).toBe(signature(paperFor(1, 2)));
    expect(signature(paperFor(1))).not.toBe(signature(paperFor(1, 2)));
  });

  it("does not depend on the order rules or questions come from the database", () => {
    const shuffledRules = [...RULES].reverse().map((r) => ({ ...r, questions: [...r.questions].reverse() }));
    const a = paperFor(7);
    const b = drawPaper({ seed: seedFor(learner(7), BLUEPRINT, 1), rules: shuffledRules });
    expect(a.items.map((i) => i.questionId)).toEqual(b.items.map((i) => i.questionId));
  });

  it("matches the golden output (guards against silent algorithm changes)", () => {
    const p = paperFor(1);
    expect(p.items.map((i) => i.questionId)).toMatchInlineSnapshot(`
      [
        "KT01-q01",
        "KT02-q02",
        "KT01-q03",
        "KT01-q11",
        "KT01-q10",
        "KT02-q04",
        "KT02-q06",
        "KT03-q07",
        "KT03-q10",
        "KT03-q06",
      ]
    `);
    expect(p.items[0]!.options.map((o) => o.id)).toMatchInlineSnapshot(`
      [
        "KT01-q1-o1",
        "KT01-q1-o3",
        "KT01-q1-o2",
        "KT01-q1-o4",
      ]
    `);
  });

  it("gives every paper exactly the blueprint's questions per curriculum component", () => {
    for (let i = 0; i < 200; i++) {
      const p = paperFor(i);
      const cov = coverageOf(p.items);
      expect(Object.fromEntries(cov)).toEqual({ KT01: 4, KT02: 3, KT03: 3 });
      expect(new Set(p.items.map((x) => x.questionId)).size).toBe(10); // no repeats
      expect(p.items.map((x) => x.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    }
  });

  it("gives different learners different papers (seeded cohort of 300)", () => {
    const n = 300;
    const papers = Array.from({ length: n }, (_, i) => paperFor(i));
    // Question sets and full papers (order + options) are almost all unique.
    const sets = new Set(papers.map((p) => p.items.map((i) => i.questionId).sort().join(",")));
    const full = new Set(papers.map(signature));
    expect(full.size).toBe(n);
    expect(sets.size).toBeGreaterThan(n * 0.97);
    // Two neighbours rarely share the same first question.
    let sameFirst = 0;
    for (let i = 1; i < n; i++) if (papers[i]!.items[0]!.questionId === papers[i - 1]!.items[0]!.questionId) sameFirst++;
    expect(sameFirst / n).toBeLessThan(0.15);
  });

  it("exposes every question at roughly its fair rate (no favourites)", () => {
    const n = 600;
    const counts = new Map<string, number>();
    for (let i = 0; i < n; i++) for (const it of paperFor(i).items) counts.set(it.questionId, (counts.get(it.questionId) ?? 0) + 1);
    for (const rule of RULES) {
      const expected = (n * rule.count) / rule.questions.length;
      // Chi-square over the bank: with k-1 degrees of freedom, well under the 0.1% critical value.
      const chi = rule.questions.reduce((s, q) => s + ((counts.get(q.questionId) ?? 0) - expected) ** 2 / expected, 0);
      expect(chi).toBeLessThan(35);
      for (const q of rule.questions) {
        expect(counts.get(q.questionId)).toBeGreaterThan(expected * 0.7);
        expect(counts.get(q.questionId)).toBeLessThan(expected * 1.3);
      }
    }
  });

  it("keeps pinned options in place on every paper", () => {
    for (let i = 0; i < 100; i++) {
      for (const it of paperFor(i).items) {
        expect(it.options.at(-1)!.id.endsWith("-o4")).toBe(true);
        expect(it.options.map((o) => o.id).sort()).toEqual(
          [1, 2, 3, 4].map((j) => it.options[0]!.id.replace(/-o\d$/, `-o${j}`)).sort(),
        );
      }
    }
  });

  it("shuffles unpinned options (not always in author order)", () => {
    let authorOrder = 0;
    let total = 0;
    for (let i = 0; i < 50; i++) {
      for (const it of paperFor(i).items) {
        total++;
        if (it.options.slice(0, 3).map((o) => o.id.slice(-1)).join("") === "123") authorOrder++;
      }
    }
    expect(authorOrder / total).toBeLessThan(0.3);
  });

  it("prefers unseen questions on a retry", () => {
    const first = paperFor(3, 1);
    const seen = new Map(first.items.map((i) => [i.questionId, 1]));
    const second = paperFor(3, 2, seen);
    expect(second.usedFallback).toBe(false);
    const overlap = second.items.filter((i) => seen.has(i.questionId));
    expect(overlap).toHaveLength(0);
  });

  it("falls back to the least-recently-seen questions when a bank runs short", () => {
    const small: DrawRule[] = [{ ruleId: "r1", component: "KT01", count: 3, questions: bank("KT01", 4) }];
    const seed = (a: number) => seedFor(learner(9), BLUEPRINT, a);
    const p1 = drawPaper({ seed: seed(1), rules: small });
    const seen = new Map(p1.items.map((i) => [i.questionId, 1]));
    const p2 = drawPaper({ seed: seed(2), rules: small, lastSeen: seen });
    expect(p2.usedFallback).toBe(true);
    const unseen = small[0]!.questions.map((q) => q.questionId).filter((q) => !seen.has(q));
    expect(p2.items.map((i) => i.questionId)).toEqual(expect.arrayContaining(unseen));
    // Third attempt: everything seen; the attempt-1-only questions come first.
    for (const it of p2.items) seen.set(it.questionId, 2);
    const p3 = drawPaper({ seed: seed(3), rules: small, lastSeen: seen });
    const onlyFirst = [...seen].filter(([, n]) => n === 1).map(([q]) => q);
    expect(p3.items.map((i) => i.questionId)).toEqual(expect.arrayContaining(onlyFirst));
  });

  it("refuses to draw from a bank smaller than the rule", () => {
    expect(() =>
      drawPaper({
        seed: seedFor(learner(1), BLUEPRINT, 1),
        rules: [{ ruleId: "r1", component: "KT01", count: 5, questions: bank("KT01", 4) }],
      }),
    ).toThrow(PoolTooSmallError);
  });
});

describe("chooseQuestions", () => {
  it("ignores duplicate ids and input order", () => {
    const rng = () => rngFromSeed(seedFor(learner(1), "x", 1));
    const a = chooseQuestions(["c", "a", "b", "a"], 2, new Map(), rng());
    const b = chooseQuestions(["b", "c", "a"], 2, new Map(), rng());
    expect(a.chosen).toEqual(b.chosen);
  });
});
