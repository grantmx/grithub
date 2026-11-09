import { CommsError } from "@/lib/server/comms";
import { getSessionForViewer } from "@/lib/server/liveSessions";
import { getActor, getServerCtx } from "@/lib/server/request";

/** GET /sessions/:id/ics: the session as a calendar file, for its cohort's learners and staff. */
export async function GET(_req: Request, { params }: { params: Promise<{ sessionId: string }> }): Promise<Response> {
  const { sessionId } = await params;
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  if (!actor) return new Response("Sign in", { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return new Response("Not found", { status: 404 });
  try {
    const v = await getSessionForViewer(ctx, actor, sessionId);
    return new Response(v.ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="session.ics"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof CommsError) return new Response("Not found", { status: 404 });
    throw e;
  }
}
