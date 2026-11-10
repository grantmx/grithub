import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { proxy } from "@/proxy";
import { sessionCookieName } from "@/lib/server/session";
import {
  actorFor,
  auditActions,
  createTestDb,
  makeCtx,
  makeUser,
  type TestDb,
} from "./helpers";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
  // The proxy uses the app's DB singleton; point it at the test database.
  (globalThis as { __lmsDb?: unknown }).__lmsDb = t.db;
});
afterAll(async () => {
  (globalThis as { __lmsDb?: unknown }).__lmsDb = undefined;
  await t?.teardown();
});

const ORIGIN = "https://lms.test.invalid";
const cookie = sessionCookieName(true);

async function visit(path: string, token?: string) {
  const req = new NextRequest(`${ORIGIN}${path}`, {
    headers: token ? { cookie: `${cookie}=${token}` } : {},
  });
  const res = await proxy(req);
  const location = res.headers.get("location");
  return location
    ? new URL(location).pathname + new URL(location).search
    : "next";
}

async function tokenFor(opts: Parameters<typeof makeUser>[1]) {
  const user = await makeUser(t.db, opts);
  const { token } = await actorFor(makeCtx(t.db), user.id);
  return { user, token };
}

describe("proxy (middleware) enforcement", () => {
  it("lets public pages through without a session", async () => {
    expect(await visit("/signin")).toBe("next");
    expect(await visit("/api/health")).toBe("next");
    expect(await visit("/setup/some-token")).toBe("next");
  });

  it("sends anonymous visitors to sign in, keeping the destination", async () => {
    expect(await visit("/admin/people")).toBe("/signin?next=%2Fadmin%2Fpeople");
  });

  it("ignores an unknown or revoked session cookie", async () => {
    expect(await visit("/", "not-a-session")).toBe("/signin?next=%2F");
  });

  it("sends users who have not finished setup to /setup", async () => {
    const { token } = await tokenFor({ setupComplete: false });
    expect(await visit("/", token)).toBe("/setup");
    expect(await visit("/setup", token)).toBe("next");
  });

  it("step-up: SDP admin without a passkey is sent to add one (and it's audited)", async () => {
    const { user, token } = await tokenFor({
      roles: ["sdp_admin"],
      passkeys: 0,
    });
    expect(await visit("/admin/people", token)).toBe(
      "/account/passkeys?required=1&next=%2Fadmin%2Fpeople",
    );
    expect(await auditActions(t.db, user.id)).toContain(
      "auth.permission_denied",
    );
  });

  it("step-up: assessor and moderator without a passkey", async () => {
    const assessor = await tokenFor({ roles: ["assessor"], passkeys: 0 });
    expect(await visit("/staff/marking", assessor.token)).toMatch(
      /^\/account\/passkeys\?required=1/,
    );
    const moderator = await tokenFor({ roles: ["moderator"], passkeys: 0 });
    expect(await visit("/staff/moderation", moderator.token)).toMatch(
      /^\/account\/passkeys\?required=1/,
    );
  });

  it("allows privileged screens once a passkey exists", async () => {
    const admin = await tokenFor({ roles: ["sdp_admin"], passkeys: 1 });
    expect(await visit("/admin/people", admin.token)).toBe("next");
    const assessor = await tokenFor({ roles: ["assessor"], passkeys: 1 });
    expect(await visit("/staff/marking", assessor.token)).toBe("next");
  });

  it("forbids the wrong role", async () => {
    const learner = await tokenFor({});
    expect(await visit("/staff", learner.token)).toBe("/forbidden");
    expect(await visit("/admin", learner.token)).toBe("/forbidden");
    const evaluator = await tokenFor({ roles: ["external_evaluator"] });
    expect(await visit("/staff/evidence", evaluator.token)).toBe("next");
    expect(await visit("/staff/marking", evaluator.token)).toBe("/forbidden");
  });

  it("audits every page an external evaluator opens (path only)", async () => {
    const { user, token } = await tokenFor({ roles: ["external_evaluator"] });
    expect(await visit("/staff/evidence/form5?x=1", token)).toBe("next");
    expect(await auditActions(t.db, user.id)).toContain("evaluator.page.viewed");
    const learner = await tokenFor({});
    await visit("/", learner.token);
    expect(await auditActions(t.db, learner.user.id)).not.toContain("evaluator.page.viewed");
  });

  it("ignores expired role grants (e.g. evaluator access after the visit)", async () => {
    const evaluator = await tokenFor({
      roles: ["external_evaluator"],
      roleExpiresAt: new Date(Date.now() - 1000),
    });
    expect(await visit("/staff/evidence", evaluator.token)).toBe("/forbidden");
  });
});
