import { describe, expect, it } from "vitest";
import {
  orderOptions,
  pickQuestion,
  rngFromSeed,
  seedFor,
  shuffle,
} from "@/lib/randomization";

const LEARNER_A = "00000000-0000-4000-8000-00000000000a";
const LEARNER_B = "00000000-0000-4000-8000-00000000000b";
const SECTION = "00000000-0000-4000-8000-0000000000s1";

const opts = (n: number, pinnedLast = false) =>
  Array.from({ length: n }, (_, i) => ({
    id: `opt-${i + 1}`,
    authorOrder: i + 1,
    pinnedPosition: pinnedLast && i === n - 1 ? -1 : null,
  }));

const order = (learner: string, attempt: number, n = 6) =>
  orderOptions(opts(n), rngFromSeed(seedFor(learner, SECTION, attempt))).map(
    (o) => o.id,
  );

describe("seeded shuffle", () => {
  it("is deterministic for the same learner, item and attempt", () => {
    expect(order(LEARNER_A, 1)).toEqual(order(LEARNER_A, 1));
    expect(seedFor(LEARNER_A, SECTION, 1)).toBe(seedFor(LEARNER_A, SECTION, 1));
  });

  it("differs between learners", () => {
    expect(order(LEARNER_A, 1)).not.toEqual(order(LEARNER_B, 1));
  });

  it("differs between attempts for the same learner", () => {
    expect(order(LEARNER_A, 1)).not.toEqual(order(LEARNER_A, 2));
  });

  it("varies across many learners (not a fixed permutation)", () => {
    const seen = new Set(
      Array.from({ length: 50 }, (_, i) =>
        order(`00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, 1).join(
          ",",
        ),
      ),
    );
    expect(seen.size).toBeGreaterThan(20);
  });

  it("keeps every option exactly once", () => {
    expect(order(LEARNER_A, 3).sort()).toEqual(
      opts(6)
        .map((o) => o.id)
        .sort(),
    );
  });

  it("always keeps a pinned option (e.g. 'All of the above') last", () => {
    for (let attempt = 1; attempt <= 25; attempt++) {
      const out = orderOptions(
        opts(4, true),
        rngFromSeed(seedFor(LEARNER_A, SECTION, attempt)),
      );
      expect(out.at(-1)?.id).toBe("opt-4");
    }
  });

  it("matches golden outputs (guards against silent algorithm changes)", () => {
    expect(seedFor(LEARNER_A, SECTION, 1)).toMatchInlineSnapshot(
      `"82f255fab1a33802aa685bd050991b6364f849e639a8cc9f1d7cf6163d6b4019"`,
    );
    expect(order(LEARNER_A, 1)).toMatchInlineSnapshot(`
      [
        "opt-4",
        "opt-1",
        "opt-5",
        "opt-2",
        "opt-3",
        "opt-6",
      ]
    `);
    expect(order(LEARNER_B, 1)).toMatchInlineSnapshot(`
      [
        "opt-5",
        "opt-6",
        "opt-2",
        "opt-3",
        "opt-4",
        "opt-1",
      ]
    `);
  });

  it("produces a roughly uniform distribution", () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 4000; i++) {
      const first = shuffle(
        ["a", "b", "c", "d"],
        rngFromSeed(seedFor(`learner-${i}`, SECTION, 1)),
      )[0]!;
      counts.set(first, (counts.get(first) ?? 0) + 1);
    }
    for (const n of counts.values()) expect(n).toBeGreaterThan(850); // expected 1000 each
  });
});

describe("pickQuestion", () => {
  const pool = ["q1", "q2", "q3", "q4"];

  it("is deterministic for the same seed", () => {
    const a = pickQuestion(
      pool,
      new Map(),
      rngFromSeed(seedFor(LEARNER_A, SECTION, 1)),
    );
    const b = pickQuestion(
      pool,
      new Map(),
      rngFromSeed(seedFor(LEARNER_A, SECTION, 1)),
    );
    expect(a).toEqual(b);
  });

  it("prefers questions the learner has not seen", () => {
    for (let attempt = 1; attempt <= 20; attempt++) {
      const seen = new Map([
        ["q1", 1],
        ["q2", 2],
        ["q3", 3],
      ]);
      const pick = pickQuestion(
        pool,
        seen,
        rngFromSeed(seedFor(LEARNER_A, SECTION, attempt)),
      );
      expect(pick).toEqual({ questionId: "q4", usedFallback: false });
    }
  });

  it("falls back to the least-recently-seen question when all are seen", () => {
    const seen = new Map([
      ["q1", 3],
      ["q2", 1],
      ["q3", 2],
      ["q4", 4],
    ]);
    expect(
      pickQuestion(pool, seen, rngFromSeed(seedFor(LEARNER_A, SECTION, 5))),
    ).toEqual({
      questionId: "q2",
      usedFallback: true,
    });
  });

  it("does not depend on the order the pool is listed in", () => {
    const rng = () => rngFromSeed(seedFor(LEARNER_A, SECTION, 1));
    expect(pickQuestion(pool, new Map(), rng())).toEqual(
      pickQuestion([...pool].reverse(), new Map(), rng()),
    );
  });
});
