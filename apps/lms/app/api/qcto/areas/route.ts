import { searchAreas } from "@/lib/server/qctoProfile";
import { RATE_LIMITS, hitRateLimit } from "@/lib/server/ratelimit";
import { getActor, getServerCtx } from "@/lib/server/request";

/**
 * GET /api/qcto/areas?province=1&q=kens → up to 20 Stats SA areas in that
 * province (LEISA column AG), for the profile step's type-ahead. Public
 * reference data, but signed-in users only (rate limited per user).
 */
export async function GET(request: Request): Promise<Response> {
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  if (!actor || actor.status === "suspended")
    return new Response(null, { status: 401 });
  if (
    !(await hitRateLimit(ctx, RATE_LIMITS.areaSearch, actor.userId)).allowed
  ) {
    return new Response(null, { status: 429 });
  }
  const url = new URL(request.url);
  const areas = await searchAreas(
    ctx,
    url.searchParams.get("province") ?? "",
    url.searchParams.get("q") ?? "",
  );
  return Response.json(
    { areas },
    { headers: { "Cache-Control": "private, max-age=3600" } },
  );
}
