import { redirect } from "next/navigation";
import { type AccessContext, decide, requirementFor } from "@/lib/access";
import { writeAudit } from "./audit";
import type { ServerCtx } from "./context";
import { getActor, getServerCtx } from "./request";

/**
 * Defence in depth for server components: re-check the route rule the proxy
 * already enforced, and redirect the same way if it fails.
 */
export async function requirePage(
  pathname: string,
): Promise<{ ctx: ServerCtx; actor: AccessContext }> {
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  const decision = decide(requirementFor(pathname), actor);
  if (decision.result === "allow" && actor) return { ctx, actor };
  if (decision.result === "signin" || !actor)
    redirect(`/signin?next=${encodeURIComponent(pathname)}`);
  if (decision.result === "setup") redirect("/setup");
  await writeAudit(ctx, {
    action: "auth.permission_denied",
    actorId: actor.userId,
    entityType: "route",
    after: { path: pathname, result: decision.result, layer: "page" },
  });
  if (decision.result === "stepup") {
    redirect(
      `/account/passkeys?required=1&next=${encodeURIComponent(pathname)}`,
    );
  }
  redirect("/forbidden");
}
