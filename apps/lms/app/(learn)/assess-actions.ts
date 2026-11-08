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

const str = (form: FormData, key: string) => String(form.get(key) ?? "");
const int = (form: FormData, key: string) => {
  const n = Number.parseInt(str(form, key), 10);
  return Number.isFinite(n) ? n : 0;
};

function errorCode(e: unknown): string | null {
  if (e instanceof AssessmentError) return e.code;
  if (e instanceof RateLimitError) return "rate_limited";
  return null;
}

export async function beginAttemptAction(form: FormData): Promise<void> {
  const { ctx, actor } = await requireActor();
  const scheduleId = str(form, "scheduleId");
  let id: string;
  try {
    id = await beginAttempt(ctx, actor, scheduleId);
  } catch (e) {
    const code = errorCode(e);
    if (code) redirect(`/learn/assessment/${encodeURIComponent(scheduleId)}?error=${code}`);
    throw e;
  }
  redirect(attemptUrl(id, "", { q: 1 }));
}

/** Read the answer fields for the current question from a form. */
function answerFrom(form: FormData) {
  const type = str(form, "type");
  return type === "short_answer"
    ? { text: str(form, "text") }
    : { tokens: form.getAll("token").map(String) };
}

/** Save the current answer, then go to another question, the review page, or toggle the flag. */
export async function saveAndGoAction(form: FormData): Promise<void> {
  const { ctx, actor } = await requireActor();
  const attemptId = str(form, "attemptId");
  const position = int(form, "position");
  const go = str(form, "go");
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
    const { savedAt } = await saveAnswer(ctx, actor, attemptId, position, {
      tokens: Array.isArray(answer.tokens) ? answer.tokens.map(String) : undefined,
      text: typeof answer.text === "string" ? answer.text : undefined,
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
  const attemptId = str(form, "attemptId");
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
  const attemptId = str(form, "attemptId");
  try {
    await submitAppeal(ctx, actor, attemptId, str(form, "reason"));
  } catch (e) {
    const code = errorCode(e);
    if (code) redirect(`${attemptUrl(attemptId, "/result", { error: code })}#appeal`);
    throw e;
  }
  redirect(`${attemptUrl(attemptId, "/result", { appealed: 1 })}#appeal`);
}
