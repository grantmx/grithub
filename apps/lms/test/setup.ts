// Test-only configuration. These are NOT secrets: fake values for a fake
// origin, used only inside the test process.
process.env.WEBAUTHN_RP_ID = "lms.test.invalid";
process.env.WEBAUTHN_RP_NAME = "GRIT Hub Learning (test)";
process.env.WEBAUTHN_ORIGIN = "https://lms.test.invalid";
process.env.SESSION_SECRET = "test-only-session-secret-not-used-anywhere-else";
process.env.EMAIL_TRANSPORT = "memory";
// Fresh random PII keys per test run (packages/db/src/pii.ts).
import { generatePiiKey } from "db/pii";
process.env.PII_ENCRYPTION_KEYS = `1:${generatePiiKey()}`;
process.env.PII_BLIND_INDEX_KEY = generatePiiKey();
