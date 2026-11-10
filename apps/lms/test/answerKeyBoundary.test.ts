import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Static guard for the answer-key boundary (CLAUDE.md, ADR-007). The runtime
 * tests in assessments.test.ts and sectionCheck.test.ts prove the learner
 * views carry no option ids, correctness, explanations or rubrics before
 * grading; this test makes sure the code paths that could carry them never
 * reach the learner side or the browser bundle:
 *
 * 1. Learner routes (app/(learn)) never import the staff-only key modules
 *    (marking, practical marking, authoring, materials, analytics, paper
 *    exports, evidence pack).
 * 2. No client component ("use client") imports a server module at runtime
 *    (type-only imports are erased), so server-side views can't be bundled.
 * 3. Client components reachable from learner routes never mention key fields.
 */

const root = path.resolve(__dirname, "..");
const KEY_MODULES = [
  "marking",
  "practicalMarking",
  "authoring",
  "briefAuthoring",
  "materials",
  "analytics",
  "paperExport",
  "paperPdf",
  "evidencePack",
  "moderationExport",
];
const KEY_FIELDS =
  /\b(isCorrect|correctToken|correctOptionIds?|rubric\w*|answerKey|memo)\b/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}
const rel = (f: string) => path.relative(root, f);
const read = (f: string) => readFileSync(f, "utf8");
const isClient = (src: string) =>
  /^\s*["']use client["'];?/m.test(src.split("\n").slice(0, 5).join("\n"));

/** Runtime (non type-only) import specifiers of a file. */
function runtimeImports(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(
    /^import\s+(type\s+)?([^;]*?)\s+from\s+["']([^"']+)["']/gm,
  )) {
    if (m[1]) continue; // import type { … }
    const names = m[2] ?? "";
    // import { type A, type B } from "x" — all-type named imports are erased too.
    const braced = /^\{([^}]*)\}$/.exec(names.trim());
    if (
      braced &&
      braced[1]!
        .split(",")
        .every((n) => n.trim() === "" || n.trim().startsWith("type "))
    )
      continue;
    out.push(m[3]!);
  }
  return out;
}

function resolve(from: string, spec: string): string | null {
  const base = spec.startsWith("@/")
    ? path.join(root, spec.slice(2))
    : spec.startsWith(".")
      ? path.resolve(path.dirname(from), spec)
      : null;
  if (!base) return null;
  for (const c of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

/** Every local file reachable from `entries` through runtime imports. */
function reachable(entries: string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [...entries];
  while (stack.length) {
    const f = stack.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    for (const spec of runtimeImports(read(f))) {
      const r = resolve(f, spec);
      if (r) stack.push(r);
    }
  }
  return seen;
}

const learnerEntries = files(path.join(root, "app", "(learn)"));
const learnerGraph = reachable(learnerEntries);

describe("answer-key boundary (static)", () => {
  it("learner routes never import staff-only key modules", () => {
    const offenders = [...learnerGraph]
      .filter((f) => KEY_MODULES.some((m) => rel(f) === `lib/server/${m}.ts`))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("client components never import server modules at runtime", () => {
    const offenders: string[] = [];
    for (const f of ["app", "components", "lib"].flatMap((d) =>
      files(path.join(root, d)),
    )) {
      const src = read(f);
      if (!isClient(src)) continue;
      // Server actions ("use server" files under app/) are allowed: the bundle only gets a reference.
      for (const spec of runtimeImports(src)) {
        const r = resolve(f, spec);
        const serverModule = r !== null && rel(r).startsWith("lib/server/");
        const database = spec === "db" || spec.startsWith("db/");
        if (serverModule || database) offenders.push(`${rel(f)} -> ${spec}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("client components on learner routes never mention answer-key fields", () => {
    const offenders = [...learnerGraph]
      .filter((f) => isClient(read(f)) && KEY_FIELDS.test(read(f)))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("the guard actually sees the learner graph", () => {
    expect(learnerGraph.size).toBeGreaterThan(learnerEntries.length);
    expect(
      [...learnerGraph].some((f) => rel(f) === "lib/server/sectionCheck.ts"),
    ).toBe(true);
    expect([...learnerGraph].some((f) => isClient(read(f)))).toBe(true);
  });
});
