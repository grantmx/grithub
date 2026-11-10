"use server";

import { redirect } from "next/navigation";
import { AssessmentError } from "@/lib/server/assessments";
import { AccessDeniedError } from "@/lib/server/auth";
import { addRule, createBlueprint, createSchedule, publishBlueprint, removeRule } from "@/lib/server/authoring";
import {
  addCriterion,
  addVariant,
  createBrief,
  publishBrief,
  removeCriterion,
  removeVariant,
  scheduleBrief,
} from "@/lib/server/briefAuthoring";
import { PracticalError } from "@/lib/server/practical";
import { InputError, checkId, id, text } from "@/lib/server/input";
import { getActor, getServerCtx } from "@/lib/server/request";

/** Admin assessment authoring actions (SDP admin + passkey, checked in lib/server/authoring.ts). */

const int = (form: FormData, key: string) => Number.parseInt(text(form, key), 10);

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
    if (e instanceof AssessmentError || e instanceof InputError) redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect(to);
}

export async function createBlueprintAction(form: FormData) {
  await run("/admin/assessments", async (ctx, actor) => {
    const limit = text(form, "timeLimitMinutes");
    const attempts = text(form, "maxAttempts");
    const newId = await createBlueprint(ctx, actor, {
      moduleId: id(form, "moduleId"),
      title: text(form, "title"),
      kind: text(form, "kind"),
      passMarkPercent: int(form, "passMarkPercent"),
      timeLimitMinutes: limit ? Number.parseInt(limit, 10) : null,
      maxAttempts: attempts ? Number.parseInt(attempts, 10) : undefined,
    });
    return `/admin/assessments/${newId}`;
  });
}

export async function addRuleAction(form: FormData) {
  const blueprintId = id(form, "blueprintId");
  await run(`/admin/assessments/${blueprintId}`, async (ctx, actor) => {
    await addRule(ctx, actor, blueprintId, id(form, "bankId"), int(form, "count"));
    return `/admin/assessments/${blueprintId}`;
  });
}

export async function removeRuleAction(form: FormData) {
  const blueprintId = id(form, "blueprintId");
  await run(`/admin/assessments/${blueprintId}`, async (ctx, actor) => {
    await removeRule(ctx, actor, blueprintId, id(form, "ruleId"));
    return `/admin/assessments/${blueprintId}`;
  });
}

export async function publishAction(form: FormData) {
  const blueprintId = id(form, "blueprintId");
  await run(`/admin/assessments/${blueprintId}`, async (ctx, actor) => {
    if (text(form, "confirm") !== "1") throw new AssessmentError("invalid_answer", "Tick the box to confirm publishing.");
    await publishBlueprint(ctx, actor, blueprintId);
    return `/admin/assessments/${blueprintId}?done=published`;
  });
}

/** datetime-local values are South African time (UTC+2, no daylight saving). */
function saTime(value: string): Date {
  return new Date(`${value}:00+02:00`);
}

export async function scheduleAction(form: FormData) {
  const blueprintId = id(form, "blueprintId");
  await run(`/admin/assessments/${blueprintId}`, async (ctx, actor) => {
    // Summative: an existing day ("<dayId>|<yyyy-mm-dd>") or a new one, plus start and end times.
    const [dayId = "", dayDate = ""] = text(form, "assessmentDay").split("|");
    const heldOn = text(form, "heldOn");
    const summative = text(form, "kind") === "summative";
    const date = dayId === "new" || !dayId ? heldOn : dayDate;
    const opensAt = summative ? saTime(`${date}T${text(form, "startTime")}`) : saTime(text(form, "opensAt"));
    const closesAt = summative ? saTime(`${date}T${text(form, "endTime")}`) : saTime(text(form, "closesAt"));
    await createSchedule(ctx, actor, {
      blueprintId,
      cohortId: id(form, "cohortId"),
      opensAt,
      closesAt,
      assessmentDayId: summative && dayId && dayId !== "new" ? checkId(dayId) : null,
      newDay: summative && (dayId === "new" || !dayId) ? { heldOn, venue: text(form, "venue") } : null,
    });
    return `/admin/assessments/${blueprintId}?done=scheduled`;
  });
}

// --- Practical briefs ---------------------------------------------------------

async function runBrief(back: string, fn: (ctx: Awaited<ReturnType<typeof getServerCtx>>, actor: Awaited<ReturnType<typeof getActor>>) => Promise<string>) {
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  let to: string;
  try {
    to = await fn(ctx, actor);
  } catch (e) {
    if (e instanceof AccessDeniedError) {
      redirect(e.decision.result === "stepup" ? `/account/passkeys?required=1&next=${encodeURIComponent(back)}` : "/forbidden");
    }
    if (e instanceof PracticalError || e instanceof AssessmentError || e instanceof InputError) redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect(to);
}

export async function createBriefAction(form: FormData) {
  await runBrief("/admin/practical", async (ctx, actor) => {
    const attempts = text(form, "maxAttempts");
    const newId = await createBrief(ctx, actor, {
      moduleId: id(form, "moduleId"),
      title: text(form, "title"),
      component: text(form, "component"),
      instructions: text(form, "instructions"),
      mode: text(form, "mode"),
      maxAttempts: attempts ? Number.parseInt(attempts, 10) : undefined,
    });
    return `/admin/practical/${newId}`;
  });
}

export async function briefPartAction(form: FormData) {
  const briefId = id(form, "briefId");
  const back = `/admin/practical/${briefId}`;
  await runBrief(back, async (ctx, actor) => {
    const op = text(form, "op");
    if (op === "add-criterion") await addCriterion(ctx, actor, briefId, text(form, "code"), text(form, "label"), text(form, "guidance"));
    else if (op === "remove-criterion") await removeCriterion(ctx, actor, briefId, id(form, "partId"));
    else if (op === "add-variant") await addVariant(ctx, actor, briefId, text(form, "label"), text(form, "instructions"));
    else if (op === "remove-variant") await removeVariant(ctx, actor, briefId, id(form, "partId"));
    else if (op === "publish") {
      if (text(form, "confirm") !== "1") throw new PracticalError("invalid", "Tick the box to confirm publishing.");
      await publishBrief(ctx, actor, briefId);
      return `${back}?done=published`;
    }
    return back;
  });
}

export async function scheduleBriefAction(form: FormData) {
  const briefId = id(form, "briefId");
  await runBrief(`/admin/practical/${briefId}`, async (ctx, actor) => {
    const observed = text(form, "mode") === "observed";
    const [dayId = "", dayDate = ""] = text(form, "assessmentDay").split("|");
    const heldOn = text(form, "heldOn");
    const date = dayId === "new" || !dayId ? heldOn : dayDate;
    await scheduleBrief(ctx, actor, {
      briefId,
      cohortId: id(form, "cohortId"),
      opensAt: observed ? saTime(`${date}T${text(form, "startTime")}`) : saTime(text(form, "opensAt")),
      closesAt: observed ? saTime(`${date}T${text(form, "endTime")}`) : saTime(text(form, "closesAt")),
      assessmentDayId: observed && dayId && dayId !== "new" ? checkId(dayId) : null,
      newDay: observed && (dayId === "new" || !dayId) ? { heldOn, venue: text(form, "venue") } : null,
    });
    return `/admin/practical/${briefId}?done=scheduled`;
  });
}
