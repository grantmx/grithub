import { PracticalError, evidenceUrl } from "@/lib/server/practical";
import { RateLimitError } from "@/lib/server/ratelimit";
import { getActor, getServerCtx } from "@/lib/server/request";

/**
 * GET /evidence/:evidenceId: opens one evidence item. Files redirect to a
 * 5-minute signed link (private storage); links redirect to their URL. The
 * learner may open their own; assessors, moderators and evaluators in scope
 * may open any (audited). Everyone else gets 404.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ evidenceId: string }> }): Promise<Response> {
  const { evidenceId } = await params;
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  if (!actor) return new Response("Sign in", { status: 401 });
  try {
    const url = await evidenceUrl(ctx, actor, evidenceId);
    return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  } catch (e) {
    if (e instanceof PracticalError) return new Response(e.code === "invalid" ? e.message : "Not found", { status: e.code === "invalid" ? 403 : 404 });
    if (e instanceof RateLimitError) return new Response("Too many requests", { status: 429 });
    throw e;
  }
}
