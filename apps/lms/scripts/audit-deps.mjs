// Dependency audit gate for apps/lms and packages/db (CI: .github/workflows/lms-checks.yml).
//
// Runs `yarn audit` for production dependencies across the monorepo, keeps only
// advisories whose dependency path starts in the `lms` or `db` workspace, and
// fails on HIGH or CRITICAL unless the advisory is in audit-allowlist.json with
// a reason and an expiry date that hasn't passed. Prints a summary only.
//
// Usage (repo root): node apps/lms/scripts/audit-deps.mjs [--json-file audit.json]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACES = ["lms", "db"];
const FAIL_ON = new Set(["high", "critical"]);

function auditLines() {
  const i = process.argv.indexOf("--json-file");
  if (i > 0) return readFileSync(process.argv[i + 1], "utf8");
  try {
    return execFileSync(
      "yarn",
      ["audit", "--groups", "dependencies", "--json"],
      {
        encoding: "utf8",
        maxBuffer: 256 * 1024 * 1024,
      },
    );
  } catch (e) {
    // yarn audit exits non-zero whenever anything is found; the output is still complete.
    if (typeof e.stdout === "string" && e.stdout.length > 0) return e.stdout;
    throw e;
  }
}

const allowlist = JSON.parse(
  readFileSync(path.join(here, "..", "audit-allowlist.json"), "utf8"),
);
const today = new Date().toISOString().slice(0, 10);
const allowed = new Map(
  allowlist.advisories
    .filter((a) => a.expires >= today)
    .map((a) => [a.ghsa, a]),
);
const expired = allowlist.advisories.filter((a) => a.expires < today);

const found = new Map();
for (const line of auditLines().split("\n")) {
  if (!line.startsWith("{")) continue;
  let row;
  try {
    row = JSON.parse(line);
  } catch {
    continue;
  }
  if (row.type !== "auditAdvisory") continue;
  const p = row.data.resolution.path;
  if (!WORKSPACES.some((w) => p.startsWith(`${w}>`))) continue;
  const a = row.data.advisory;
  const key = a.github_advisory_id ?? String(a.id);
  if (!found.has(key))
    found.set(key, {
      ghsa: key,
      severity: a.severity,
      module: a.module_name,
      title: a.title,
      patched: a.patched_versions,
      path: p,
    });
}

const rows = [...found.values()];
const blocking = rows.filter(
  (r) => FAIL_ON.has(r.severity) && !allowed.has(r.ghsa),
);
const waived = rows.filter(
  (r) => FAIL_ON.has(r.severity) && allowed.has(r.ghsa),
);
const counts = rows.reduce(
  (c, r) => ({ ...c, [r.severity]: (c[r.severity] ?? 0) + 1 }),
  {},
);

console.log(
  `LMS/db production dependency advisories: ${JSON.stringify(counts)}`,
);
for (const r of waived)
  console.log(
    `WAIVED   ${r.severity.padEnd(8)} ${r.module} ${r.ghsa} (until ${allowed.get(r.ghsa).expires}): ${allowed.get(r.ghsa).reason}`,
  );
for (const r of blocking)
  console.log(
    `BLOCKING ${r.severity.padEnd(8)} ${r.module} ${r.ghsa} via ${r.path} | fixed in ${r.patched} | ${r.title}`,
  );
for (const a of expired)
  console.log(
    `EXPIRED  waiver for ${a.ghsa} (${a.expires}): review it or remove it from audit-allowlist.json`,
  );

if (blocking.length > 0 || expired.length > 0) {
  console.error(
    `\nFailing: ${blocking.length} blocking advisor${blocking.length === 1 ? "y" : "ies"}, ${expired.length} expired waiver(s).`,
  );
  process.exit(1);
}
console.log("No unwaived high or critical advisories.");
