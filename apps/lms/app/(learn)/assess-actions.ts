"use server";

import { redirect } from "next/navigation";
import {
  AssessmentError,
  beginAttempt,
  saveAnswer,
  setFlag,
  submitAppeal,
  submitAttempt,
} from "@/lib/server/assessments";
import { RateLimitError } from "@/lib/server/ratelimit";
import { InputError, checkId, checkNumber, checkText, checkTexts, id, text, texts } from "@/lib/server/input";
import { getActor, getServerCtx } from "@/lib/server/request";

/**
 * Learner assessment actions. Navigation and submission are plain form posts
 * (they work without JavaScript); the attempt page also autosaves each change
 * through `autosaveAction` and shows "Saved" / "Not saved – reconnecting".
 */

async function requireActor() {
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  if (!actor) redirect("/signin");
  return { ctx, actor };
}

/** /learn/attempt/<id>[/<page>][?params] */
function attemptUrl(
  id: string,
  page = "",
  params: Record<string, string | number> = {},
): string {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  return `/learn/attempt/${encodeURIComponent(id)}${page}${qs ? `?${qs}` : ""}`;
}

const int = (form: FormData, key: string) => {
  const n = Number.parseInt(text(form, key), 10);
  return Number.isFinite(n) ? n : 0;
};

function errorCode(e: unknown): string | null {
  if (e instanceof AssessmentError) return e.code;
  if (e instanceof RateLimitError) return "rate_limited";
  // Only a tampered request gets here; the pages show this code as "couldn't be saved".
  if (e instanceof InputError) return "invalid_answer";
  return null;
}

export async function beginAttemptAction(form: FormData): Promise<void> {
  const { ctx, actor } = await requireActor();
  const scheduleId = id(form, "scheduleId");
  let attemptId: string;
  try {
    attemptId = await beginAttempt(ctx, actor, scheduleId);
  } catch (e) {
    const code = errorCode(e);
    if (code) redirect(`/learn/assessment/${encodeURIComponent(scheduleId)}?error=${code}`);
    throw e;
  }
  redirect(attemptUrl(attemptId, "", { q: 1 }));
}

/** Read the answer fields for the current question from a form. */
function answerFrom(form: FormData) {
  const type = text(form, "type");
  return type === "short_answer"
    ? { text: text(form, "text") }
    : { tokens: texts(form, "token", 100, 200) };
}

/** Save the current answer, then go to another question, the review page, or toggle the flag. */
export async function saveAndGoAction(form: FormData): Promise<void> {
  const { ctx, actor } = await requireActor();
  const attemptId = id(form, "attemptId");
  const position = int(form, "position");
  const go = text(form, "go");
  try {
    await saveAnswer(ctx, actor, attemptId, position, answerFrom(form));
    if (go === "flag" || go === "unflag") {
      await setFlag(ctx, actor, attemptId, position, go === "flag");
    }
  } catch (e) {
    const code = errorCode(e);
    if (code === "time_up" || code === "submitted") redirect(attemptUrl(attemptId, "/result"));
    if (code) redirect(attemptUrl(attemptId, "", { q: position, error: code }));
    throw e;
  }
  if (go === "review") redirect(attemptUrl(attemptId, "/review"));
  const target = go === "flag" || go === "unflag" ? position : Number.parseInt(go, 10);
  redirect(attemptUrl(attemptId, "", { q: Number.isFinite(target) && target > 0 ? target : position }));
}

export type AutosaveResult = { ok: true; savedAt: string } | { ok: false; code: string };

/** Called by the attempt page on every change. Never returns answers or keys. */
export async function autosaveAction(
  attemptId: string,
  position: number,
  answer: { tokens?: string[]; text?: string },
): Promise<AutosaveResult> {
  const { ctx, actor } = await requireActor();
  try {
    if (typeof answer !== "object" || answer === null) throw new InputError();
    const { savedAt } = await saveAnswer(ctx, actor, checkId(attemptId), checkNumber(position), {
      tokens: Array.isArray(answer.tokens) ? checkTexts(answer.tokens, 100, 200) : undefined,
      text: typeof answer.text === "string" ? checkText(answer.text) : undefined,
    });
    return { ok: true, savedAt };
  } catch (e) {
    const code = errorCode(e);
    if (code) return { ok: false, code };
    throw e;
  }
}

export async function submitAttemptAction(form: FormData): Promise<void> {
  const { ctx, actor } = await requireActor();
  const attemptId = id(form, "attemptId");
  try {
    await submitAttempt(ctx, actor, attemptId);
  } catch (e) {
    const code = errorCode(e);
    if (code) redirect(attemptUrl(attemptId, "/review", { error: code }));
    throw e;
  }
  redirect(attemptUrl(attemptId, "/result", { submitted: 1 }));
}

export async function appealAction(form: FormData): Promise<void> {
  const { ctx, actor } = await requireActor();
  const attemptId = id(form, "attemptId");
  try {
    await submitAppeal(ctx, actor, attemptId, text(form, "reason"));
  } catch (e) {
    const code = errorCode(e);
    if (code) redirect(`${attemptUrl(attemptId, "/result", { error: code })}#appeal`);
    throw e;
  }
  redirect(`${attemptUrl(attemptId, "/result", { appealed: 1 })}#appeal`);
}
