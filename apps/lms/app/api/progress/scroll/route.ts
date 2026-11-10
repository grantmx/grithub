import { readAuthConfig } from "@/lib/server/env";
import { isUuid } from "@/lib/server/input";
import { LearningError, saveScrollPosition } from "@/lib/server/learning";
import { RATE_LIMITS, hitRateLimit } from "@/lib/server/ratelimit";
import { getActor, getServerCtx } from "@/lib/server/request";

/**
 * POST /api/progress/scroll {sectionId, percent}: saves the reading position
 * (sent with navigator.sendBeacon when the learner leaves or pauses), so
 * "Continue" can resume where they stopped. Same-origin only.
 */
export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (!origin || origin !== readAuthConfig().origin)
    return new Response(null, { status: 403 });
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  if (!actor) return new Response(null, { status: 401 });
  if (
    !(await hitRateLimit(ctx, RATE_LIMITS.scrollSave, actor.userId)).allowed
  ) {
    return new Response(null, { status: 429 });
  }
  let body: { sectionId?: unknown; percent?: unknown };
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new Response(null, { status: 400 });
  }
  if (
    typeof body.sectionId !== "string" ||
    !isUuid(body.sectionId) ||
    typeof body.percent !== "number" ||
    !Number.isFinite(body.percent)
  ) {
    return new Response(null, { status: 400 });
  }
  try {
    await saveScrollPosition(ctx, actor, body.sectionId, body.percent);
  } catch (e) {
    if (e instanceof LearningError) return new Response(null, { status: 404 });
    throw e;
  }
  return new Response(null, { status: 204 });
}
