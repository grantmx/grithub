import { AssessmentError } from "@/lib/server/assessments";
import { AccessDeniedError } from "@/lib/server/auth";
import { exportPaperPdf } from "@/lib/server/paperExport";
import { RateLimitError } from "@/lib/server/ratelimit";
import { getActor, getServerCtx } from "@/lib/server/request";

/**
 * GET /staff/attempts/:attemptId/pdf: the learner's paper in the exact
 * served order, for the record. Generated from the immutable attempt rows;
 * the checksum is audit-logged and sent as a header.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ attemptId: string }> }): Promise<Response> {
  const { attemptId } = await params;
  const ctx = await getServerCtx();
  try {
    const { bytes, sha256, filename } = await exportPaperPdf(ctx, await getActor(ctx), attemptId);
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
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
