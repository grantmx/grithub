import { redirect } from "next/navigation";
import { AccessDeniedError } from "@/lib/server/auth";
import { CommsError } from "@/lib/server/comms";
import { exportEvidencePack } from "@/lib/server/evidencePack";
import { RateLimitError } from "@/lib/server/ratelimit";
import { getActor, getServerCtx } from "@/lib/server/request";

/**
 * GET /staff/evidence/form5/pack: the one-click Form 5 evidence pack (one
 * PDF) for SDP admins and external evaluators. The checksum is audit-logged
 * and sent as a header.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request): Promise<Response> {
  const q = new URL(req.url).searchParams;
  const qualificationId = q.get("qualification") ?? "";
  const back = `/staff/evidence/form5?qualification=${encodeURIComponent(qualificationId)}`;
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  if (!actor) redirect(`/signin?next=${encodeURIComponent(back)}`);
  try {
    const { bytes, sha256, filename } = await exportEvidencePack(ctx, actor, {
      qualificationId,
      cohortId: q.get("cohort") || undefined,
      from: q.get("from") || undefined,
      to: q.get("to") || undefined,
    });
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-SHA256": sha256,
      },
    });
  } catch (e) {
    if (e instanceof AccessDeniedError) redirect(e.decision.result === "signin" ? "/signin" : "/forbidden");
    if (e instanceof CommsError) {
      if (e.code === "not_found") return new Response("Not found", { status: 404 });
      redirect(`${back}&error=${encodeURIComponent(e.message)}`);
    }
    if (e instanceof RateLimitError) redirect(`${back}&error=${encodeURIComponent("Too many exports. Please wait a few minutes.")}`);
    throw e;
  }
}
