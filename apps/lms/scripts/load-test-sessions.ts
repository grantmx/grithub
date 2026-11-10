// Mint sign-in sessions for DEMO accounts so the k6 load test can open
// learner pages (passkeys can't be scripted). docs/lms/dossier/03-capacity-and-load-test.md
//
// Usage (staging or a local copy seeded with `yarn workspace db db:seed`):
//   DATABASE_URL=<staging db> SESSION_SECRET=… WEBAUTHN_RP_ID=… WEBAUTHN_ORIGIN=… \
//   ALLOW_DEMO_SEED=true yarn workspace lms load:sessions [perUser=5] > sessions.txt
//
// Same guard as the demo seed: refuses production and non-local databases
// unless ALLOW_DEMO_SEED=true. Only users on the reserved DEMO domain
// (@example.invalid) get sessions. Output: one session token per line, for
// LMS_SESSION_TOKENS. Treat the file as a secret and delete it after the run;
// revoke the sessions with `yarn workspace lms load:sessions --revoke`.
import { and, eq, isNull, like } from "drizzle-orm";
import { createDb, readDbConfig, sessions, users } from "db";
import { assertSeedAllowed } from "db/seed";
import { createSession } from "@/lib/server/session";

/** The reserved DEMO email domain used by the seed (packages/db/src/seed-data.ts). */
const DEMO_EMAIL_DOMAIN = "example.invalid";

async function main() {
  const config = readDbConfig();
  assertSeedAllowed(process.env, config.url);
  const { db, close } = createDb(config);
  try {
    const demo = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          like(users.email, `%@${DEMO_EMAIL_DOMAIN}`),
          eq(users.status, "active"),
        ),
      );
    if (process.argv.includes("--revoke")) {
      for (const u of demo) {
        await db
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(and(eq(sessions.userId, u.id), isNull(sessions.revokedAt)));
      }
      console.error(`Revoked sessions for ${demo.length} DEMO users.`);
      return;
    }
    const perUser = Math.max(
      1,
      Math.min(50, Number(process.argv[2] ?? 5) || 5),
    );
    const ctx = { db, ipHash: null, now: () => new Date() };
    for (const u of demo) {
      for (let i = 0; i < perUser; i++) {
        const { token } = await createSession(ctx, u.id, "magic_link");
        process.stdout.write(`${token}\n`);
      }
    }
    console.error(
      `Created ${demo.length * perUser} sessions for ${demo.length} DEMO users (14-day expiry).`,
    );
  } finally {
    await close();
  }
}

void main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
