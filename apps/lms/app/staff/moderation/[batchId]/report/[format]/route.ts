import { AssessmentError } from "@/lib/server/assessments";
import { AccessDeniedError } from "@/lib/server/auth";
import { exportModerationReport } from "@/lib/server/moderationExport";
import { RateLimitError } from "@/lib/server/ratelimit";
import { getActor, getServerCtx } from "@/lib/server/request";

/**
 * GET /staff/moderation/:batchId/report/pdf|csv: the batch's moderation
 * report (moderators in scope). The checksum is audit-logged and sent as a header.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ batchId: string; format: string }> },
): Promise<Response> {
  const { batchId, format } = await params;
  if (format !== "pdf" && format !== "csv") return new Response("Not found", { status: 404 });
  const ctx = await getServerCtx();
  try {
    const { bytes, sha256, filename, contentType } = await exportModerationReport(ctx, await getActor(ctx), batchId, format);
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
    if (e instanceof AssessmentError) return new Response("Not found", { status: 404 });
    if (e instanceof RateLimitError) {
      return new Response("Too many requests", { status: 429, headers: { "Retry-After": String(e.retryAfterSeconds) } });
    }
    throw e;
  }
}
