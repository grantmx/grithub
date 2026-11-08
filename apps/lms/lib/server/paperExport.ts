import type { AccessContext } from "@/lib/access";
import { writeAudit } from "./audit";
import type { ServerCtx } from "./context";
import { sha256Hex } from "./crypto";
import { getReplay } from "./marking";
import { buildPaperPdf } from "./paperPdf";
import { RATE_LIMITS, enforceRateLimit } from "./ratelimit";

/** Build a learner's paper PDF for the record; the export and its checksum are audited. */
export async function exportPaperPdf(
  ctx: ServerCtx,
  actor: AccessContext | null,
  attemptId: string,
): Promise<{ bytes: Uint8Array; sha256: string; filename: string }> {
  const replay = await getReplay(ctx, actor, attemptId);
  await enforceRateLimit(ctx, RATE_LIMITS.paperExport, actor!.userId);
  const bytes = await buildPaperPdf(replay);
  const sha256 = sha256Hex(bytes);
  await writeAudit(ctx, {
    action: "assessment.paper.exported",
    actorId: actor!.userId,
    entityType: "assessment_attempt",
    entityId: attemptId,
    after: { sha256, bytes: bytes.byteLength },
  });
  const safe = replay.blueprint.title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "paper";
  return { bytes, sha256, filename: `${safe}-attempt-${replay.attempt.attemptNo}-${attemptId.slice(0, 8)}.pdf` };
}
