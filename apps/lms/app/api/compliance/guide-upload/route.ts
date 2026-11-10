import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { AccessDeniedError } from "@/lib/server/auth";
import { CommsError } from "@/lib/server/comms";
import { guideUploadPolicy } from "@/lib/server/complianceDocs";
import { RateLimitError } from "@/lib/server/ratelimit";
import { getActor, getServerCtx } from "@/lib/server/request";

/**
 * POST /api/compliance/guide-upload: a short-lived Vercel Blob client-upload
 * token for one learner guide PDF (SDP admins, private access, 50 MB). The
 * file goes straight from the browser to storage; the admin page then
 * confirms it (server action), which verifies, checksums and records it.
 */
export async function POST(request: Request): Promise<Response> {
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  if (!actor) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { qualificationId } = JSON.parse(clientPayload ?? "{}") as { qualificationId?: string };
        const policy = await guideUploadPolicy(ctx, actor, String(qualificationId ?? ""), pathname);
        return { ...policy, tokenPayload: JSON.stringify({ qualificationId }) };
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    if (e instanceof CommsError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof AccessDeniedError) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    if (e instanceof RateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    throw e;
  }
}
