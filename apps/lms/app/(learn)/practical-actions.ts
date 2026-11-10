"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/access";
import { InputError, checkId, checkText, id, text } from "@/lib/server/input";
import {
  addLink,
  confirmUpload,
  PracticalError,
  removeEvidence,
  submitPractical,
  submitPracticalAppeal,
  type EvidenceView,
} from "@/lib/server/practical";
import { RateLimitError } from "@/lib/server/ratelimit";
import { getActor, getServerCtx } from "@/lib/server/request";

/**
 * Learner practical actions. Links, removal, submit and appeals are plain
 * form posts; files upload directly from the browser to private storage and
 * are then confirmed here (`confirmUploadAction`).
 */

async function requireActor() {
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  if (!actor) redirect("/signin");
  return { ctx, actor };
}

const briefUrl = (scheduleId: string, params: Record<string, string> = {}, hash = "") => {
  const qs = new URLSearchParams(params).toString();
  return `/learn/practical/${encodeURIComponent(scheduleId)}${qs ? `?${qs}` : ""}${hash}`;
};

function message(e: unknown): string | null {
  if (e instanceof PracticalError || e instanceof InputError) return e.message;
  if (e instanceof RateLimitError) return "Too many tries. Please wait a few minutes.";
  return null;
}

export type ConfirmResult = { ok: true; item: EvidenceView } | { ok: false; message: string };

/** Called by the uploader after each direct upload finishes. */
export async function confirmUploadAction(submissionId: string, pathname: string, fileName: string): Promise<ConfirmResult> {
  const { ctx, actor } = await requireActor();
  try {
    return { ok: true, item: await confirmUpload(ctx, actor, checkId(submissionId), checkText(pathname, 1000), checkText(fileName, 1000)) };
  } catch (e) {
    const m = message(e);
    if (m) return { ok: false, message: m };
    throw e;
  }
}

export async function addLinkAction(form: FormData): Promise<void> {
  const { ctx, actor } = await requireActor();
  const scheduleId = id(form, "scheduleId");
  const back = safeNext(text(form, "back"), briefUrl(scheduleId));
  try {
    await addLink(ctx, actor, id(form, "submissionId"), text(form, "url"));
  } catch (e) {
    const m = message(e);
    if (m) redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(m)}#evidence`);
    throw e;
  }
  redirect(`${back}#evidence`);
}

export async function removeEvidenceAction(form: FormData): Promise<void> {
  const { ctx, actor } = await requireActor();
  const back = safeNext(text(form, "back"), "/learn");
  try {
    await removeEvidence(ctx, actor, id(form, "evidenceId"));
  } catch (e) {
    const m = message(e);
    if (m) redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(m)}#evidence`);
    throw e;
  }
  redirect(`${back}#evidence`);
}

export async function submitPracticalAction(form: FormData): Promise<void> {
  const { ctx, actor } = await requireActor();
  const scheduleId = id(form, "scheduleId");
  try {
    await submitPractical(ctx, actor, id(form, "submissionId"), text(form, "linksConfirmed") === "1");
  } catch (e) {
    const m = message(e);
    if (m) redirect(briefUrl(scheduleId, { error: m }, "#submit"));
    throw e;
  }
  redirect(briefUrl(scheduleId, { submitted: "1" }));
}

export async function practicalAppealAction(form: FormData): Promise<void> {
  const { ctx, actor } = await requireActor();
  const scheduleId = id(form, "scheduleId");
  try {
    await submitPracticalAppeal(ctx, actor, id(form, "submissionId"), text(form, "reason"));
  } catch (e) {
    const m = message(e);
    if (m) redirect(briefUrl(scheduleId, { error: m }, "#history"));
    throw e;
  }
  redirect(briefUrl(scheduleId, { appealed: "1" }, "#history"));
}
