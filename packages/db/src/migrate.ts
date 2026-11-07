import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "./client";
import { type DbConfig, readDbConfig } from "./env";

export const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../migrations", import.meta.url),
);

/** Apply all committed migrations in packages/db/migrations. */
export async function runMigrations(
  config: DbConfig = readDbConfig(),
): Promise<void> {
  const { db, close } = createDb({ ...config, poolMax: 1 });
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await close();
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  runMigrations()
    .then(() => {
      console.log("Migrations applied.");
    })
    .catch((error: unknown) => {
      console.error(
        "Migration failed:",
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    });
}
