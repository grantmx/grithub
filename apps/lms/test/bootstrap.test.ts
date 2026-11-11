import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { roleGrants, users } from "db";
import { BootstrapError, bootstrapFirstAdmin } from "@/lib/server/bootstrap";
import { requestMagicLink } from "@/lib/server/auth";
import { memoryOutbox } from "@/lib/server/email";
import { auditActions, createTestDb, makeCtx, makeUser, type TestDb } from "./helpers";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
afterAll(async () => {
  await t?.teardown();
});

describe("bootstrapFirstAdmin (first SDP admin in an empty deployment)", () => {
  it("validates the input", async () => {
    const ctx = makeCtx(t.db);
    await expect(
      bootstrapFirstAdmin(ctx, { name: " ", email: "first.admin@example.invalid" }),
    ).rejects.toBeInstanceOf(BootstrapError);
    await expect(
      bootstrapFirstAdmin(ctx, { name: "First Admin (fake)", email: "not-an-email" }),
    ).rejects.toBeInstanceOf(BootstrapError);
  });

  it("creates an invited user with sdp_admin, audits with ids only, and they can get a magic link", async () => {
    const ctx = makeCtx(t.db);
    const email = "first.admin@example.invalid";
    const { userId, created } = await bootstrapFirstAdmin(ctx, {
      name: "First Admin (fake)",
      email,
    });
    expect(created).toBe(true);
    const [user] = await t.db.select().from(users).where(eq(users.id, userId));
    expect(user?.status).toBe("invited");
    const grants = await t.db
      .select()
      .from(roleGrants)
      .where(eq(roleGrants.userId, userId));
    expect(grants.map((g) => [g.role, g.cohortId])).toEqual([["sdp_admin", null]]);

    const audit = await t.db.query.auditLog.findFirst({
      where: (a, { eq: e }) => e(a.action, "admin.bootstrap.sdp_admin"),
    });
    expect(audit?.entityId).toBe(userId);
    expect(JSON.stringify(audit?.after)).not.toContain(email);

    memoryOutbox.length = 0;
    await requestMagicLink(makeCtx(t.db), email.toUpperCase());
    expect(memoryOutbox).toHaveLength(1);
    expect(memoryOutbox[0]?.to).toBe(email);
    expect(await auditActions(t.db, userId)).toContain("auth.magic_link.requested");
  });

  it("refuses once an SDP admin exists", async () => {
    await expect(
      bootstrapFirstAdmin(makeCtx(t.db), {
        name: "Second Admin (fake)",
        email: "second.admin@example.invalid",
      }),
    ).rejects.toThrow(/already exists/);
  });

  it("ignores expired admin grants and refuses deactivated accounts", async () => {
    const fresh = await createTestDb();
    try {
      await makeUser(fresh.db, {
        roles: ["sdp_admin"],
        roleExpiresAt: new Date(Date.now() - 60_000),
      });
      const suspended = await makeUser(fresh.db, { status: "suspended" });
      await expect(
        bootstrapFirstAdmin(makeCtx(fresh.db), {
          name: "X (fake)",
          email: suspended.email,
        }),
      ).rejects.toThrow(/deactivated/);
      const ok = await bootstrapFirstAdmin(makeCtx(fresh.db), {
        name: "Existing (fake)",
        email: "existing.admin@example.invalid",
      });
      expect(ok.created).toBe(true);
    } finally {
      await fresh.teardown();
    }
  });
});
