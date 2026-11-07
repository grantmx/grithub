import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { passkeyCredentials, users } from "db";
import {
  AuthError,
  passkeyRegistrationOptions,
  passkeySignInOptions,
  revokeOwnPasskey,
  verifyPasskeyRegistration,
  verifyPasskeySignIn,
} from "@/lib/server/auth";
import { loadAccessContext } from "@/lib/server/session";
import {
  actorFor,
  auditActions,
  createTestDb,
  makeCtx,
  makeUser,
  newAuthenticator,
  type TestDb,
} from "./helpers";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
afterAll(async () => {
  await t?.teardown();
});

/** Register a real passkey for a user via the server code + software authenticator. */
async function registerPasskey(userId: string, label = "Test laptop") {
  const ctx = makeCtx(t.db);
  const { actor } = await actorFor(ctx, userId);
  const authenticator = newAuthenticator();
  const { options, challengeId } = await passkeyRegistrationOptions(ctx, actor);
  const { passkeyId } = await verifyPasskeyRegistration(
    ctx,
    actor,
    challengeId,
    authenticator.register(options),
    label,
  );
  return { authenticator, passkeyId, actor, ctx };
}

async function signIn(
  authenticator: ReturnType<typeof newAuthenticator>,
  opts?: { counter?: number; origin?: string },
) {
  const ctx = makeCtx(t.db);
  const { options, challengeId } = await passkeySignInOptions(ctx);
  return verifyPasskeySignIn(
    ctx,
    challengeId,
    authenticator.authenticate(options, opts),
  );
}

describe("passkey registration", () => {
  it("stores credential id, public key, counter, transports, label and timestamps", async () => {
    const user = await makeUser(t.db);
    const { authenticator, passkeyId } = await registerPasskey(
      user.id,
      "Work laptop",
    );
    const [row] = await t.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.id, passkeyId));
    expect(row).toMatchObject({
      userId: user.id,
      credentialId: authenticator.credentialId,
      signCount: 0,
      transports: ["internal"],
      deviceLabel: "Work laptop",
      revokedAt: null,
      lastUsedAt: null,
    });
    expect(row?.publicKey.length).toBeGreaterThan(0);
    expect(row?.createdAt).toBeInstanceOf(Date);
    expect(await auditActions(t.db, user.id)).toContain("auth.passkey.added");
  });

  it("lets a user register several passkeys", async () => {
    const user = await makeUser(t.db);
    await registerPasskey(user.id, "Phone");
    await registerPasskey(user.id, "Laptop");
    const rows = await t.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.userId, user.id));
    expect(rows.map((r) => r.deviceLabel).sort()).toEqual(["Laptop", "Phone"]);
  });

  it("rejects a reused (single-use) challenge", async () => {
    const user = await makeUser(t.db);
    const ctx = makeCtx(t.db);
    const { actor } = await actorFor(ctx, user.id);
    const { options, challengeId } = await passkeyRegistrationOptions(
      ctx,
      actor,
    );
    const response = newAuthenticator().register(options);
    await verifyPasskeyRegistration(ctx, actor, challengeId, response, "One");
    await expect(
      verifyPasskeyRegistration(ctx, actor, challengeId, response, "Two"),
    ).rejects.toMatchObject({
      code: "challenge_invalid",
    });
  });

  it("requires a signed-in user", async () => {
    await expect(
      passkeyRegistrationOptions(makeCtx(t.db), null),
    ).rejects.toBeInstanceOf(AuthError);
  });
});

describe("passkey sign-in", () => {
  it("creates a passkey session, updates the counter and last_used_at, and audits", async () => {
    const user = await makeUser(t.db);
    const { authenticator, passkeyId } = await registerPasskey(user.id);
    const session = await signIn(authenticator);
    expect(session.userId).toBe(user.id);
    const actor = await loadAccessContext(makeCtx(t.db), session.token);
    expect(actor?.userId).toBe(user.id);

    const [row] = await t.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.id, passkeyId));
    expect(row?.signCount).toBe(1);
    expect(row?.lastUsedAt).toBeInstanceOf(Date);
    expect(await auditActions(t.db, user.id)).toContain("auth.signin.passkey");
  });

  it("fails for a REVOKED passkey (and audits the failure)", async () => {
    const user = await makeUser(t.db);
    const { authenticator, passkeyId, actor, ctx } = await registerPasskey(
      user.id,
    );
    await signIn(authenticator); // works before revocation
    await revokeOwnPasskey(ctx, actor, passkeyId);
    await expect(signIn(authenticator)).rejects.toMatchObject({
      code: "verification_failed",
    });
    const failures = await t.db.query.auditLog.findMany({
      where: (a, { eq: e }) => e(a.action, "auth.signin.failed"),
    });
    expect(
      failures.some(
        (f) =>
          (f.after as { reason?: string })?.reason ===
          "unknown_or_revoked_credential",
      ),
    ).toBe(true);
  });

  it("fails for a deactivated user", async () => {
    const user = await makeUser(t.db);
    const { authenticator } = await registerPasskey(user.id);
    await t.db
      .update(users)
      .set({ status: "suspended" })
      .where(eq(users.id, user.id));
    await expect(signIn(authenticator)).rejects.toBeInstanceOf(AuthError);
  });

  it("fails for the wrong origin (phishing site)", async () => {
    const user = await makeUser(t.db);
    const { authenticator } = await registerPasskey(user.id);
    await expect(
      signIn(authenticator, { origin: "https://evil.example" }),
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("fails when the signature counter goes backwards (cloned authenticator)", async () => {
    const user = await makeUser(t.db);
    const { authenticator } = await registerPasskey(user.id);
    await signIn(authenticator, { counter: 5 });
    await expect(signIn(authenticator, { counter: 3 })).rejects.toBeInstanceOf(
      AuthError,
    );
  });

  it("rejects a reused sign-in challenge", async () => {
    const user = await makeUser(t.db);
    const { authenticator } = await registerPasskey(user.id);
    const ctx = makeCtx(t.db);
    const { options, challengeId } = await passkeySignInOptions(ctx);
    await verifyPasskeySignIn(
      ctx,
      challengeId,
      authenticator.authenticate(options),
    );
    await expect(
      verifyPasskeySignIn(
        ctx,
        challengeId,
        authenticator.authenticate(options),
      ),
    ).rejects.toMatchObject({
      code: "challenge_invalid",
    });
  });
});

describe("passkey revocation", () => {
  it("audits revocation and hides the passkey from the active count", async () => {
    const user = await makeUser(t.db);
    const { passkeyId, ctx } = await registerPasskey(user.id);
    await registerPasskey(user.id, "Second");
    const { actor } = await actorFor(ctx, user.id);
    expect(actor.activePasskeys).toBe(2);
    await revokeOwnPasskey(ctx, actor, passkeyId);
    const after = await actorFor(ctx, user.id);
    expect(after.actor.activePasskeys).toBe(1);
    expect(await auditActions(t.db, user.id)).toContain("auth.passkey.revoked");
  });

  it("stops staff who need a passkey from removing their last one", async () => {
    const admin = await makeUser(t.db, { roles: ["sdp_admin"] });
    const { passkeyId, ctx } = await registerPasskey(admin.id);
    const { actor } = await actorFor(ctx, admin.id);
    await expect(revokeOwnPasskey(ctx, actor, passkeyId)).rejects.toMatchObject(
      { code: "last_passkey" },
    );
  });

  it("lets learners remove their only passkey", async () => {
    const learner = await makeUser(t.db);
    const { passkeyId, ctx } = await registerPasskey(learner.id);
    const { actor } = await actorFor(ctx, learner.id);
    await revokeOwnPasskey(ctx, actor, passkeyId);
  });

  it("can't revoke someone else's passkey", async () => {
    const owner = await makeUser(t.db);
    const other = await makeUser(t.db);
    const { passkeyId, ctx } = await registerPasskey(owner.id);
    const { actor } = await actorFor(ctx, other.id);
    await expect(revokeOwnPasskey(ctx, actor, passkeyId)).rejects.toMatchObject(
      { code: "not_found" },
    );
  });
});
