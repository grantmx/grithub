import { openNotification } from "@/lib/server/notify";
import { getActor, getServerCtx } from "@/lib/server/request";

/**
 * GET /notifications/:id: marks the signed-in user's notification read and
 * goes to the item it points at (only the owner's own rows; the link is
 * always a same-site path).
 */
export async function GET(request: Request, { params }: { params: Promise<{ notificationId: string }> }): Promise<Response> {
  const { notificationId } = await params;
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  const origin = new URL(request.url).origin;
  if (!actor) {
    return Response.redirect(`${origin}/signin?next=${encodeURIComponent(`/notifications/${notificationId}`)}`, 302);
  }
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const link = UUID.test(notificationId) ? await openNotification(ctx, actor, notificationId) : "/notifications";
  return new Response(null, { status: 302, headers: { Location: `${origin}${link}`, "Cache-Control": "private, no-store" } });
}
