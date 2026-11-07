// Test-only configuration. These are NOT secrets: fake values for a fake
// origin, used only inside the test process.
process.env.WEBAUTHN_RP_ID = "lms.test.invalid";
process.env.WEBAUTHN_RP_NAME = "GRIT Hub Learning (test)";
process.env.WEBAUTHN_ORIGIN = "https://lms.test.invalid";
process.env.SESSION_SECRET = "test-only-session-secret-not-used-anywhere-else";
process.env.EMAIL_TRANSPORT = "memory";
