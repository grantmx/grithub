import { createHash } from "node:crypto";

/**
 * Seeded, reproducible randomization (docs/lms/randomization.md §3–5).
 *
 *   seed      = SHA-256(learnerId + ":" + itemId + ":" + attemptNo)
 *   prng      = xoshiro128** seeded from the first 16 bytes of the seed
 *   selection = prefer unseen questions, then least-recently-seen
 *   order     = Fisher–Yates over unpinned options; pinned options re-inserted
 *
 * Pure and deterministic: the same inputs always give the same output, so
 * results can be reproduced. They are ALSO persisted in attempt_items, and
 * stored rows always win (a refresh never re-draws).
 * Golden-output tests (test/randomization.test.ts) guard against silent changes.
 */

export function seedFor(
  learnerId: string,
  itemId: string,
  attemptNo: number,
): string {
  return createHash("sha256")
    .update(`${learnerId}:${itemId}:${attemptNo}`)
    .digest("hex");
}

export type Rng = () => number;

/** xoshiro128** — small, fast, well-distributed 32-bit PRNG. Returns [0, 1). */
export function rngFromSeed(seedHex: string): Rng {
  const bytes = Buffer.from(seedHex, "hex");
  if (bytes.length < 16) throw new Error("Seed must be at least 16 bytes");
  let a = bytes.readUInt32BE(0);
  let b = bytes.readUInt32BE(4);
  let c = bytes.readUInt32BE(8);
  let d = bytes.readUInt32BE(12);
  if ((a | b | c | d) === 0) a = 1; // all-zero state is invalid
  const rotl = (x: number, k: number) => (x << k) | (x >>> (32 - k));
  return () => {
    const result = Math.imul(rotl(Math.imul(b, 5), 7), 9) >>> 0;
    const t = b << 9;
    c ^= a;
    d ^= b;
    b ^= c;
    a ^= d;
    c ^= t;
    d = rotl(d, 11);
    return result / 4294967296;
  };
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export type OrderableOption = {
  id: string;
  /** Fixed display position: 0-based from the start, or negative from the end (-1 = last). */
  pinnedPosition: number | null;
  /** Author order, used as the stable starting order before shuffling. */
  authorOrder: number;
};

/** Shuffle unpinned options, then place pinned ones (e.g. "All of the above") at their positions. */
export function orderOptions<T extends OrderableOption>(
  options: readonly T[],
  rng: Rng,
): T[] {
  const sorted = [...options].sort((x, y) => x.authorOrder - y.authorOrder);
  const pinned = sorted.filter((o) => o.pinnedPosition !== null);
  const result = shuffle(
    sorted.filter((o) => o.pinnedPosition === null),
    rng,
  );
  const total = sorted.length;
  // Resolve pinned positions to absolute indexes; insert in ascending order.
  const placements = pinned
    .map((o) => {
      const p = o.pinnedPosition!;
      return {
        o,
        index: Math.min(total - 1, Math.max(0, p < 0 ? total + p : p)),
      };
    })
    .sort((x, y) => x.index - y.index);
  for (const { o, index } of placements) result.splice(index, 0, o);
  return result;
}

/**
 * Choose one question for a section check. Prefer questions never served to
 * this learner; if all have been seen, choose among the least-recently-seen.
 * `lastSeen` maps question id → most recent attempt number it was served in.
 */
export function pickQuestion(
  questionIds: readonly string[],
  lastSeen: ReadonlyMap<string, number>,
  rng: Rng,
): { questionId: string; usedFallback: boolean } {
  if (questionIds.length === 0) throw new Error("The question pool is empty");
  const sorted = [...questionIds].sort(); // stable base order, independent of DB order
  const unseen = sorted.filter((q) => !lastSeen.has(q));
  if (unseen.length > 0) {
    return {
      questionId: unseen[Math.floor(rng() * unseen.length)]!,
      usedFallback: false,
    };
  }
  const oldest = Math.min(...sorted.map((q) => lastSeen.get(q)!));
  const candidates = sorted.filter((q) => lastSeen.get(q) === oldest);
  return {
    questionId: candidates[Math.floor(rng() * candidates.length)]!,
    usedFallback: true,
  };
}
