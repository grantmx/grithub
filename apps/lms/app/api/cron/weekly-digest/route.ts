import { runCron } from "@/lib/server/cron";
import { runWeeklyDigest } from "@/lib/server/notify";

// Vercel Cron, Mondays 05:00 UTC (07:00 SAST): the weekly email digest
// (design.md §14, 2026-11-08). Runs at most once per ISO week.
export const dynamic = "force-dynamic";

export function GET(req: Request): Promise<Response> {
  return runCron(req, (ctx) => runWeeklyDigest(ctx));
}
