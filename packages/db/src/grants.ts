import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { readDbConfig } from "./env";

/**
 * Apply sql/least-privilege.sql (creates or re-grants the lms_app runtime role).
 * Run as the table OWNER (the migration role), after `db:migrate`:
 *   DATABASE_URL=<owner/migration URL> yarn workspace db db:grants
 * It never sets a password: do that interactively (`\password lms_app` in psql
 * or the provider's dashboard) and store the lms_app URL only in Vercel.
 */
const SCRIPT = fileURLToPath(
  new URL("../sql/least-privilege.sql", import.meta.url),
);

export async function applyGrants(
  url = readDbConfig().url,
  ssl = readDbConfig().ssl,
): Promise<void> {
  const sql = postgres(url, { ssl, max: 1, onnotice: () => {} });
  try {
    await sql.unsafe(readFileSync(SCRIPT, "utf8"));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  applyGrants()
    .then(() =>
      console.log(
        "lms_app grants applied. Set its password interactively if it is new.",
      ),
    )
    .catch((error: unknown) => {
      console.error(
        "Grants failed:",
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    });
}
