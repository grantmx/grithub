import { and, eq, isNull, or, gt, sql } from "drizzle-orm";
import { roleGrants, users } from "db";
import type { ServerCtx } from "./context";
import { writeAudit } from "./audit";

export class BootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BootstrapError";
  }
}

/**
 * Create the first SDP admin in an empty deployment (README: "bootstrapping
 * the first real SDP admin"). One-off: refuses once any current SDP admin
 * exists, so later admins are only ever granted from /admin by an admin.
 *
 * The account is created as "invited"; the person then signs in with a magic
 * link on /signin and goes through first-time setup (POPIA notice, profile,
 * passkey). Nothing personal is logged or audited: the audit row holds ids.
 */
export async function bootstrapFirstAdmin(
  ctx: Pick<ServerCtx, "db" | "ipHash" | "now">,
  input: { name: string; email: string },
): Promise<{ userId: string; created: boolean }> {
  const name = input.name.trim();
  const email = input.email.trim();
  if (!name) throw new BootstrapError("A display name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new BootstrapError("That isn't a valid email address.");

  return ctx.db.transaction(async (tx) => {
    // Serialise concurrent runs so only one can become the first admin.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('lms.bootstrap_admin'))`);
    const now = ctx.now();
    const [existingAdmin] = await tx
      .select({ id: roleGrants.id })
      .from(roleGrants)
      .where(
        and(
          eq(roleGrants.role, "sdp_admin"),
          or(isNull(roleGrants.expiresAt), gt(roleGrants.expiresAt, now)),
        ),
      )
      .limit(1);
    if (existingAdmin) {
      throw new BootstrapError(
        "An SDP admin already exists. Grant further admins from /admin.",
      );
    }

    const [existingUser] = await tx
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
    if (existingUser?.status === "suspended")
      throw new BootstrapError("That account is deactivated.");

    let userId = existingUser?.id;
    if (!userId) {
      const [created] = await tx
        .insert(users)
        .values({ displayName: name, email, status: "invited" })
        .returning({ id: users.id });
      if (!created) throw new Error("Failed to create user");
      userId = created.id;
    }
    await tx.insert(roleGrants).values({ userId, role: "sdp_admin" });
    await writeAudit(
      { db: tx, ipHash: ctx.ipHash },
      {
        action: "admin.bootstrap.sdp_admin",
        actorId: null,
        entityType: "user",
        entityId: userId,
        after: { created: !existingUser },
      },
    );
    return { userId, created: !existingUser };
  });
}
