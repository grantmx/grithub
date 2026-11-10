import { runNightlyBackup } from "@/lib/server/backup";
import { runCron } from "@/lib/server/cron";

// Vercel Cron, daily 00:00 UTC (02:00 SAST): encrypted database backup to
// private storage, keeping the last 7 (design.md §14, 2026-11-09; Form 5 4.1.6).
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export function GET(req: Request): Promise<Response> {
  return runCron(req, (ctx) => runNightlyBackup(ctx));
}
