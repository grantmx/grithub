import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authTokens, users } from "db";
import { requestMagicLink, signInWithLink } from "@/lib/server/auth";
import { memoryOutbox } from "@/lib/server/email";
import { RateLimitError } from "@/lib/server/ratelimit";
import { issueToken } from "@/lib/server/tokens";
import {
  createTestDb,
  makeCohort,
  makeCtx,
  makeUser,
  type TestDb,
} from "./helpers";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
afterAll(async () => {
  await t?.teardown();
});
beforeEach(() => {
  memoryOutbox.length = 0;
});

const tokenFromLink = (link: string) => link.split("/").pop()!;
const HOUR = 3_600_000;

describe("invitations", () => {
  it("work once (single use)", async () => {
    const cohort = await makeCohort(t.db);
    const user = await makeUser(t.db, {
      setupComplete: false,
      cohortId: cohort.id,
    });
    const token = await issueToken(makeCtx(t.db), {
      userId: user.id,
      purpose: "invitation",
      cohortId: cohort.id,
    });

    const first = await signInWithLink(makeCtx(t.db), token, "invitation");
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.method).toBe("invitation");

    const second = await signInWithLink(makeCtx(t.db), token, "invitation");
    expect(second).toEqual({ ok: false, reason: "used" });
  });

  it("expire after 72 hours", async () => {
    const cohort = await makeCohort(t.db);
    const user = await makeUser(t.db, {
      setupComplete: false,
      cohortId: cohort.id,
    });
    const issuedAt = new Date(Date.now() - 73 * HOUR);
    const token = await issueToken(makeCtx(t.db, { now: () => issuedAt }), {
      userId: user.id,
      purpose: "invitation",
      cohortId: cohort.id,
    });
    expect(await signInWithLink(makeCtx(t.db), token, "invitation")).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("still work just before expiry", async () => {
    const user = await makeUser(t.db, { setupComplete: false });
    const issuedAt = new Date(Date.now() - 71 * HOUR);
    const token = await issueToken(makeCtx(t.db, { now: () => issuedAt }), {
      userId: user.id,
      purpose: "invitation",
    });
    expect((await signInWithLink(makeCtx(t.db), token, "invitation")).ok).toBe(
      true,
    );
  });

  it("are replaced by a newer invitation (old link revoked)", async () => {
    const user = await makeUser(t.db, { setupComplete: false });
    const old = await issueToken(makeCtx(t.db), {
      userId: user.id,
      purpose: "invitation",
    });
    const fresh = await issueToken(makeCtx(t.db), {
      userId: user.id,
      purpose: "invitation",
    });
    expect(await signInWithLink(makeCtx(t.db), old, "invitation")).toEqual({
      ok: false,
      reason: "revoked",
    });
    expect((await signInWithLink(makeCtx(t.db), fresh, "invitation")).ok).toBe(
      true,
    );
  });

  it("can't be used by a deactivated user", async () => {
    const user = await makeUser(t.db, { setupComplete: false });
    const token = await issueToken(makeCtx(t.db), {
      userId: user.id,
      purpose: "invitation",
    });
    await t.db
      .update(users)
      .set({ status: "suspended" })
      .where(eq(users.id, user.id));
    expect(await signInWithLink(makeCtx(t.db), token, "invitation")).toEqual({
      ok: false,
      reason: "deactivated",
    });
  });

  it("can't be used as a magic link (and vice versa)", async () => {
    const user = await makeUser(t.db, { setupComplete: false });
    const invite = await issueToken(makeCtx(t.db), {
      userId: user.id,
      purpose: "invitation",
    });
    expect(await signInWithLink(makeCtx(t.db), invite, "link")).toEqual({
      ok: false,
      reason: "invalid",
    });
    const magic = await issueToken(makeCtx(t.db), {
      userId: user.id,
      purpose: "magic_link",
    });
    expect(await signInWithLink(makeCtx(t.db), magic, "invitation")).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("store only a hash of the token", async () => {
    const user = await makeUser(t.db, { setupComplete: false });
    const token = await issueToken(makeCtx(t.db), {
      userId: user.id,
      purpose: "invitation",
    });
    const rows = await t.db
      .select()
      .from(authTokens)
      .where(eq(authTokens.userId, user.id));
    expect(
      rows.every(
        (r) => r.tokenHash !== token && /^[0-9a-f]{64}$/.test(r.tokenHash),
      ),
    ).toBe(true);
  });
});

describe("magic links", () => {
  it("are emailed to known users, work once and expire after 15 minutes", async () => {
    const user = await makeUser(t.db);
    await requestMagicLink(makeCtx(t.db), user.email.toUpperCase());
    expect(memoryOutbox).toHaveLength(1);
    const token = tokenFromLink(memoryOutbox[0]!.link);

    const first = await signInWithLink(makeCtx(t.db), token, "link");
    expect(first.ok && first.method).toBe("magic_link");
    expect(await signInWithLink(makeCtx(t.db), token, "link")).toEqual({
      ok: false,
      reason: "used",
    });

    const old = await issueToken(
      makeCtx(t.db, { now: () => new Date(Date.now() - 16 * 60_000) }),
      {
        userId: user.id,
        purpose: "magic_link",
      },
    );
    expect(await signInWithLink(makeCtx(t.db), old, "link")).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("send nothing for unknown or deactivated addresses (same response)", async () => {
    await requestMagicLink(makeCtx(t.db), "nobody@example.invalid");
    const suspended = await makeUser(t.db, { status: "suspended" });
    await requestMagicLink(makeCtx(t.db), suspended.email);
    expect(memoryOutbox).toHaveLength(0);
  });

  it("are rate limited per email address", async () => {
    const user = await makeUser(t.db);
    // Different IPs each time, same email: the per-email limit (5 / 15 min) applies.
    for (let i = 0; i < 5; i++)
      await requestMagicLink(makeCtx(t.db), user.email);
    await expect(
      requestMagicLink(makeCtx(t.db), user.email),
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it("token use is rate limited per IP", async () => {
    const ctx = makeCtx(t.db);
    for (let i = 0; i < 20; i++)
      await signInWithLink(ctx, `not-a-real-token-${i}`, "link");
    await expect(
      signInWithLink(ctx, "one-more", "link"),
    ).rejects.toBeInstanceOf(RateLimitError);
  });
});
