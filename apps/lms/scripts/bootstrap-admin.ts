// Create the FIRST SDP admin in a fresh deployment (one-off, audited).
//
// Usage (owner or lms_app URL of the target database):
//   DATABASE_URL=<url> yarn workspace lms admin:bootstrap "<Display Name>" <email>
//
// Refuses if an SDP admin already exists. Prints only the new user's id, never
// the name or email. Afterwards the person signs in at /signin with a magic
// link and completes first-time setup (including a passkey, required for admin).
import { createDb } from "db";
import { BootstrapError, bootstrapFirstAdmin } from "@/lib/server/bootstrap";

async function main() {
  const [name, email] = process.argv.slice(2);
  if (!name || !email) {
    console.error(
      'Usage: DATABASE_URL=<url> yarn workspace lms admin:bootstrap "<Display Name>" <email>',
    );
    process.exit(1);
  }
  const { db, close } = createDb();
  try {
    const result = await bootstrapFirstAdmin(
      { db, ipHash: null, now: () => new Date() },
      { name, email },
    );
    console.log(
      `SDP admin ${result.created ? "created" : "granted to existing account"} (user id ${result.userId}). Sign in at /signin with a magic link.`,
    );
  } catch (e) {
    if (e instanceof BootstrapError) {
      console.error(e.message);
      process.exitCode = 1;
    } else throw e;
  } finally {
    await close();
  }
}

void main();
