// yarn workspace lms demo:evidence — DEMO Form 5 evidence on top of the DEMO
// seed (local or disposable databases only; same guard as the DEMO seed).
import { createDb } from "db";
import { assertSeedAllowed } from "db/seed";
import { seedEvidenceDemo } from "./demoEvidence";

const url = process.env.DATABASE_URL ?? "";
assertSeedAllowed(process.env, url);
const { db, close } = createDb();
seedEvidenceDemo(db)
  .then((r) => console.log(r.created ? "DEMO evidence created." : "DEMO evidence already present; nothing to do."))
  .catch((e: unknown) => {
    console.error("DEMO evidence failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => close());
