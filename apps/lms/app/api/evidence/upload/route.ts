import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { PracticalError, uploadPolicy } from "@/lib/server/practical";
import { RateLimitError } from "@/lib/server/ratelimit";
import { getActor, getServerCtx } from "@/lib/server/request";

/**
 * POST /api/evidence/upload: issues a short-lived Vercel Blob client-upload
 * token for one evidence file (private access, allowed types, 20 MB). The
 * file goes straight from the browser to storage, never through a function.
 * The browser then confirms the upload (server action), which verifies and
 * records it. No completion webhook is needed.
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
        const { submissionId } = JSON.parse(clientPayload ?? "{}") as { submissionId?: string };
        const policy = await uploadPolicy(ctx, actor, String(submissionId ?? ""), pathname);
        return { ...policy, tokenPayload: JSON.stringify({ submissionId }) };
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    if (e instanceof PracticalError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof RateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    throw e;
  }
}
