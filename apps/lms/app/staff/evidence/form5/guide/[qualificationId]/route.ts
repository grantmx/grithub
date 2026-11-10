import { AccessDeniedError } from "@/lib/server/auth";
import { CommsError } from "@/lib/server/comms";
import { guideUrl } from "@/lib/server/complianceDocs";
import { RateLimitError } from "@/lib/server/ratelimit";
import { getActor, getServerCtx } from "@/lib/server/request";

/**
 * GET /staff/evidence/form5/guide/:qualificationId: open the current learner
 * guide through a 5-minute signed link (SDP admins and evaluators; audited).
 */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ qualificationId: string }> }): Promise<Response> {
  const { qualificationId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(qualificationId)) return new Response("Not found", { status: 404 });
  const ctx = await getServerCtx();
  try {
    const url = await guideUrl(ctx, await getActor(ctx), qualificationId);
    return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, no-store" } });
  } catch (e) {
    if (e instanceof AccessDeniedError) return new Response("Forbidden", { status: 403 });
    if (e instanceof CommsError) return new Response(e.code === "not_found" ? "Not found" : e.message, { status: e.code === "not_found" ? 404 : 400 });
    if (e instanceof RateLimitError) return new Response("Too many requests", { status: 429, headers: { "Retry-After": String(e.retryAfterSeconds) } });
    throw e;
  }
}
