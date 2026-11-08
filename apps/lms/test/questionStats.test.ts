import { describe, expect, it } from "vitest";
import { FLAG_RULES, versionStats, type GradedResponse } from "@/lib/questionStats";

const OPTIONS = [
  { id: "a", isCorrect: true },
  { id: "b", isCorrect: false },
  { id: "c", isCorrect: false },
];

/** n responses; `pick(i)` chooses an option, score(i) is the attempt's overall score. */
function responses(n: number, pick: (i: number) => string, score: (i: number) => number = (i) => i / n): GradedResponse[] {
  return Array.from({ length: n }, (_, i) => {
    const chosen = pick(i);
    return { attemptId: `att-${String(i).padStart(3, "0")}`, attemptScore: score(i), isCorrect: chosen === "a", chosenOptionIds: [chosen] };
  });
}

describe("question analytics flags", () => {
  it("does not flag anything below the minimum number of responses", () => {
    const s = versionStats(responses(FLAG_RULES.minResponses - 1, () => "a"), OPTIONS);
    expect(s.correctRate).toBe(1);
    expect(s.flags).toEqual([]);
  });

  it("flags too easy at 90% correct or more", () => {
    const s = versionStats(responses(20, (i) => (i < 18 ? "a" : "b")), OPTIONS);
    expect(s.correctRate).toBe(0.9);
    expect(s.flags).toContain("too_easy");
  });

  it("flags too hard at 30% correct or less", () => {
    // Correct answers spread evenly so only difficulty is flagged.
    const s = versionStats(responses(20, (i) => (i % 10 < 3 ? "a" : i % 2 ? "b" : "c")), OPTIONS);
    expect(s.correctRate).toBe(0.3);
    expect(s.flags).toContain("too_hard");
  });

  it("flags misleading when a wrong option is chosen more often than the key", () => {
    const s = versionStats(responses(30, (i) => (i < 12 ? "a" : i < 26 ? "b" : "c")), OPTIONS);
    expect(s.optionCounts.get("b")).toBe(14);
    expect(s.flags).toContain("misleading");
  });

  it("flags misleading when strong learners get it wrong more than weak learners", () => {
    // Low scorers (first half) answer correctly, high scorers don't.
    const s = versionStats(responses(30, (i) => (i < 15 ? "a" : i % 2 ? "b" : "c")), OPTIONS);
    expect(s.discrimination!).toBeLessThan(0);
    expect(s.flags).toContain("misleading");
  });

  it("does not flag a healthy question", () => {
    // ~60% correct, high scorers more often correct, distractors spread.
    const s = versionStats(responses(40, (i) => (i >= 16 ? "a" : i % 2 ? "b" : "c")), OPTIONS);
    expect(s.correctRate).toBe(0.6);
    expect(s.discrimination!).toBeGreaterThan(0);
    expect(s.flags).toEqual([]);
  });

  it("counts option selections, including multi-answer responses", () => {
    const s = versionStats(
      [
        { attemptId: "1", attemptScore: 1, isCorrect: true, chosenOptionIds: ["a", "b"] },
        { attemptId: "2", attemptScore: 0, isCorrect: false, chosenOptionIds: ["c"] },
      ],
      OPTIONS,
    );
    expect(Object.fromEntries(s.optionCounts)).toEqual({ a: 1, b: 1, c: 1 });
  });
});
