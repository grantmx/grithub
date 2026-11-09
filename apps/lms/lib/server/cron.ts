import { timingSafeEqual } from "node:crypto";
import { getDb } from "./request";
import type { ServerCtx } from "./context";
import { readAuthConfig } from "./env";

/**
 * Vercel Cron authentication: Vercel sends `Authorization: Bearer <CRON_SECRET>`.
 * Without a configured secret every call is refused.
 */
export function cronAuthorized(req: Request, secret = process.env.CRON_SECRET): boolean {
  if (!secret || secret.length < 16) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export function cronCtx(): ServerCtx {
  return { db: getDb(), config: readAuthConfig(), ipHash: null, now: () => new Date() };
}

/** Run a cron job behind the secret check; never echo configuration or errors in detail. */
export async function runCron(req: Request, job: (ctx: ServerCtx) => Promise<Record<string, unknown>>): Promise<Response> {
  if (!cronAuthorized(req)) return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const result = await job(cronCtx());
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(`[cron] job failed: ${(e as Error).message}`);
    return new Response("Job failed", { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
