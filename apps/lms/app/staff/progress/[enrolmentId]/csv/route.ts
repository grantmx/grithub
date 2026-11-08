import { AccessDeniedError } from "@/lib/server/auth";
import { learnerReport, reportToCsv } from "@/lib/server/reports";
import { getActor, getServerCtx } from "@/lib/server/request";

/** GET /staff/progress/:enrolmentId/csv: the learner's progress report as CSV. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ enrolmentId: string }> },
): Promise<Response> {
  const { enrolmentId } = await params;
  const ctx = await getServerCtx();
  try {
    const report = await learnerReport(
      ctx,
      await getActor(ctx),
      enrolmentId,
      "exported",
    );
    const safeName =
      report.learnerName
        .replace(/[^A-Za-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40) || "learner";
    return new Response(reportToCsv(report), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="progress-${safeName}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof AccessDeniedError)
      return new Response("Forbidden", { status: 403 });
    throw e;
  }
}
