import { AccessDeniedError } from "@/lib/server/auth";
import { CommsError } from "@/lib/server/comms";
import { exportCommsLog } from "@/lib/server/commsLog";
import { RateLimitError } from "@/lib/server/ratelimit";
import { getActor, getServerCtx } from "@/lib/server/request";

/**
 * Shared GET handler for the communication log export (SDP admins and
 * external evaluators). The checksum is audit-logged and sent as a header.
 */
export async function commsLogResponse(req: Request, format: "csv" | "pdf"): Promise<Response> {
  const q = new URL(req.url).searchParams;
  const ctx = await getServerCtx();
  try {
    const { bytes, sha256, filename, contentType } = await exportCommsLog(ctx, await getActor(ctx), {
      cohortId: q.get("cohort") ?? "",
      from: q.get("from") ?? "",
      to: q.get("to") ?? "",
      format,
    });
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-SHA256": sha256,
      },
    });
  } catch (e) {
    if (e instanceof AccessDeniedError) return new Response("Forbidden", { status: 403 });
    if (e instanceof CommsError) {
      if (e.code === "rate_limited") return new Response(e.message, { status: 429 });
      if (e.code === "not_found") return new Response("Not found", { status: 404 });
      return new Response(e.message, { status: 400 });
    }
    if (e instanceof RateLimitError) {
      return new Response("Too many requests", { status: 429, headers: { "Retry-After": String(e.retryAfterSeconds) } });
    }
    throw e;
  }
}
