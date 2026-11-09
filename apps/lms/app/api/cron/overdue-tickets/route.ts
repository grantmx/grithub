import { runCron } from "@/lib/server/cron";
import { runOverdueTicketEmails } from "@/lib/server/tickets";

// Vercel Cron, daily 05:00 UTC (07:00 SAST): one email per handler listing
// overdue support tickets (design.md §14, 2026-11-08). Runs at most once a day.
export const dynamic = "force-dynamic";

export function GET(req: Request): Promise<Response> {
  return runCron(req, (ctx) => runOverdueTicketEmails(ctx));
}
