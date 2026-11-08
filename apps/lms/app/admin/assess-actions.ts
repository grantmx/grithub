"use server";

import { redirect } from "next/navigation";
import { AssessmentError } from "@/lib/server/assessments";
import { AccessDeniedError } from "@/lib/server/auth";
import { addRule, createBlueprint, createSchedule, publishBlueprint, removeRule } from "@/lib/server/authoring";
import { getActor, getServerCtx } from "@/lib/server/request";

/** Admin assessment authoring actions (SDP admin + passkey, checked in lib/server/authoring.ts). */

const str = (form: FormData, key: string) => String(form.get(key) ?? "");
const int = (form: FormData, key: string) => Number.parseInt(str(form, key), 10);

async function run(back: string, fn: (ctx: Awaited<ReturnType<typeof getServerCtx>>, actor: Awaited<ReturnType<typeof getActor>>) => Promise<string>) {
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  let to: string;
  try {
    to = await fn(ctx, actor);
  } catch (e) {
    if (e instanceof AccessDeniedError) {
      redirect(e.decision.result === "stepup" ? `/account/passkeys?required=1&next=${encodeURIComponent(back)}` : "/forbidden");
    }
    if (e instanceof AssessmentError) redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect(to);
}

export async function createBlueprintAction(form: FormData) {
  await run("/admin/assessments", async (ctx, actor) => {
    const limit = str(form, "timeLimitMinutes");
    const attempts = str(form, "maxAttempts");
    const id = await createBlueprint(ctx, actor, {
      moduleId: str(form, "moduleId"),
      title: str(form, "title"),
      kind: str(form, "kind"),
      passMarkPercent: int(form, "passMarkPercent"),
      timeLimitMinutes: limit ? Number.parseInt(limit, 10) : null,
      maxAttempts: attempts ? Number.parseInt(attempts, 10) : undefined,
    });
    return `/admin/assessments/${id}`;
  });
}

export async function addRuleAction(form: FormData) {
  const id = str(form, "blueprintId");
  await run(`/admin/assessments/${id}`, async (ctx, actor) => {
    await addRule(ctx, actor, id, str(form, "bankId"), int(form, "count"));
    return `/admin/assessments/${id}`;
  });
}

export async function removeRuleAction(form: FormData) {
  const id = str(form, "blueprintId");
  await run(`/admin/assessments/${id}`, async (ctx, actor) => {
    await removeRule(ctx, actor, id, str(form, "ruleId"));
    return `/admin/assessments/${id}`;
  });
}

export async function publishAction(form: FormData) {
  const id = str(form, "blueprintId");
  await run(`/admin/assessments/${id}`, async (ctx, actor) => {
    if (form.get("confirm") !== "1") throw new AssessmentError("invalid_answer", "Tick the box to confirm publishing.");
    await publishBlueprint(ctx, actor, id);
    return `/admin/assessments/${id}?done=published`;
  });
}

/** datetime-local values are South African time (UTC+2, no daylight saving). */
function saTime(value: string): Date {
  return new Date(`${value}:00+02:00`);
}

export async function scheduleAction(form: FormData) {
  const id = str(form, "blueprintId");
  await run(`/admin/assessments/${id}`, async (ctx, actor) => {
    // Summative: an existing day ("<dayId>|<yyyy-mm-dd>") or a new one, plus start and end times.
    const [dayId = "", dayDate = ""] = str(form, "assessmentDay").split("|");
    const heldOn = str(form, "heldOn");
    const summative = str(form, "kind") === "summative";
    const date = dayId === "new" || !dayId ? heldOn : dayDate;
    const opensAt = summative ? saTime(`${date}T${str(form, "startTime")}`) : saTime(str(form, "opensAt"));
    const closesAt = summative ? saTime(`${date}T${str(form, "endTime")}`) : saTime(str(form, "closesAt"));
    await createSchedule(ctx, actor, {
      blueprintId: id,
      cohortId: str(form, "cohortId"),
      opensAt,
      closesAt,
      assessmentDayId: summative && dayId && dayId !== "new" ? dayId : null,
      newDay: summative && (dayId === "new" || !dayId) ? { heldOn, venue: str(form, "venue") } : null,
    });
    return `/admin/assessments/${id}?done=scheduled`;
  });
}
