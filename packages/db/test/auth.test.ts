import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as s from "../src/schema";
import {
  createTestDb,
  expectPgError,
  makeFixture,
  PG,
  type TestDb,
} from "./helpers";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
afterAll(async () => {
  await t?.teardown();
});

const inOneHour = () => new Date(Date.now() + 3_600_000);

describe("auth tokens", () => {
  it("cannot be reused or un-used once used_at is set", async () => {
    const f = await makeFixture(t.db);
    const [tok] = await t.db
      .insert(s.authTokens)
      .values({
        tokenHash: "a".repeat(64),
        userId: f.learner.id,
        purpose: "magic_link",
        expiresAt: inOneHour(),
      })
      .returning();
    await t.db
      .update(s.authTokens)
      .set({ usedAt: new Date() })
      .where(eq(s.authTokens.id, tok!.id));
    await expectPgError(
      t.db
        .update(s.authTokens)
        .set({ usedAt: null })
        .where(eq(s.authTokens.id, tok!.id)),
      PG.restrictViolation,
      /single use/,
    );
  });

  it("cannot be un-revoked", async () => {
    const f = await makeFixture(t.db);
    const [tok] = await t.db
      .insert(s.authTokens)
      .values({
        tokenHash: "b".repeat(64),
        userId: f.learner.id,
        purpose: "invitation",
        cohortId: f.cohort.id,
        expiresAt: inOneHour(),
        revokedAt: new Date(),
      })
      .returning();
    await expectPgError(
      t.db
        .update(s.authTokens)
        .set({ revokedAt: null })
        .where(eq(s.authTokens.id, tok!.id)),
      PG.restrictViolation,
    );
  });

  it("must expire after creation", async () => {
    const f = await makeFixture(t.db);
    await expectPgError(
      t.db.insert(s.authTokens).values({
        tokenHash: "c".repeat(64),
        userId: f.learner.id,
        purpose: "magic_link",
        expiresAt: new Date(Date.now() - 1000),
      }),
      PG.checkViolation,
    );
  });
});

describe("passkey credentials", () => {
  it("store base64url ids and cannot be un-revoked", async () => {
    const f = await makeFixture(t.db);
    const [pk] = await t.db
      .insert(s.passkeyCredentials)
      .values({
        userId: f.learner.id,
        credentialId: "dGVzdC1jcmVkZW50aWFsLWlk",
        publicKey: new Uint8Array([1, 2, 3]),
        deviceLabel: "Test phone",
        revokedAt: new Date(),
      })
      .returning();
    expect(pk?.credentialId).toBe("dGVzdC1jcmVkZW50aWFsLWlk");
    await expectPgError(
      t.db
        .update(s.passkeyCredentials)
        .set({ revokedAt: null })
        .where(eq(s.passkeyCredentials.id, pk!.id)),
      PG.restrictViolation,
      /cannot be restored/,
    );
  });

  it("reject duplicate credential ids", async () => {
    const f = await makeFixture(t.db);
    const values = {
      userId: f.learner.id,
      credentialId: "ZHVwbGljYXRl",
      publicKey: new Uint8Array([1]),
    };
    await t.db.insert(s.passkeyCredentials).values(values);
    await expectPgError(
      t.db.insert(s.passkeyCredentials).values(values),
      PG.uniqueViolation,
    );
  });
});

describe("consent records", () => {
  it("are append-only", async () => {
    const f = await makeFixture(t.db);
    const [c] = await t.db
      .insert(s.consentRecords)
      .values({
        userId: f.learner.id,
        noticeVersion: "test-1",
        noticeSha256: "d".repeat(64),
      })
      .returning();
    await expectPgError(
      t.db
        .update(s.consentRecords)
        .set({ noticeVersion: "tampered" })
        .where(eq(s.consentRecords.id, c!.id)),
      PG.restrictViolation,
    );
    await expectPgError(
      t.db.delete(s.consentRecords).where(eq(s.consentRecords.id, c!.id)),
      PG.restrictViolation,
    );
  });
});

describe("webauthn challenges", () => {
  it("registration challenges require a user", async () => {
    await expectPgError(
      t.db.insert(s.webauthnChallenges).values({
        challenge: "challenge-without-user",
        ceremony: "registration",
        expiresAt: inOneHour(),
      }),
      PG.checkViolation,
    );
  });

  it("can be used once, and never un-used", async () => {
    const [ch] = await t.db
      .insert(s.webauthnChallenges)
      .values({
        challenge: "single-use-challenge",
        ceremony: "authentication",
        expiresAt: inOneHour(),
      })
      .returning();
    await t.db
      .update(s.webauthnChallenges)
      .set({ usedAt: new Date() })
      .where(eq(s.webauthnChallenges.id, ch!.id));
    await expectPgError(
      t.db
        .update(s.webauthnChallenges)
        .set({ usedAt: null })
        .where(eq(s.webauthnChallenges.id, ch!.id)),
      PG.restrictViolation,
      /single use/,
    );
  });
});
