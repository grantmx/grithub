"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { safeNext } from "@/lib/access";
import {
  LearningError,
  completeSection,
  getMediaForLearner,
} from "@/lib/server/learning";
import {
  playbackGrant,
  readMuxConfig,
  type PlaybackGrant,
} from "@/lib/server/mux";
import { savePreferences } from "@/lib/server/preferences";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/server/ratelimit";
import { getActor, getServerCtx } from "@/lib/server/request";
import { retryCheck, submitCheckAnswer } from "@/lib/server/sectionCheck";

/**
 * Learner actions. All are plain form posts that redirect back to the page,
 * so the learning page works without JavaScript (design.md §11).
 */

async function requireActor() {
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  if (!actor) redirect("/signin");
  return { ctx, actor };
}

async function backTo(fallback: string) {
  const referer = (await headers()).get("referer");
  if (!referer) return fallback;
  try {
    const url = new URL(referer);
    return safeNext(url.pathname + url.search, fallback);
  } catch {
    return fallback;
  }
}

export async function savePreferencesAction(form: FormData): Promise<void> {
  const { ctx, actor } = await requireActor();
  await savePreferences(ctx, actor.userId, {
    textSize: form.get("textSize")?.toString(),
    theme: form.get("theme")?.toString(),
  });
  redirect(await backTo("/"));
}

const sectionUrl = (sectionId: string, hash = "") =>
  `/learn/section/${encodeURIComponent(sectionId)}${hash}`;

export async function submitCheckAction(form: FormData): Promise<void> {
  const { ctx, actor } = await requireActor();
  const sectionId = String(form.get("sectionId") ?? "");
  const token = form.get("token")?.toString();
  if (!token) redirect(sectionUrl(sectionId, "?check=choose#check"));
  try {
    await submitCheckAnswer(
      ctx,
      actor,
      String(form.get("attemptId") ?? ""),
      token,
    );
  } catch (e) {
    if (e instanceof LearningError)
      redirect(sectionUrl(sectionId, "?check=error#check"));
    throw e;
  }
  redirect(sectionUrl(sectionId, "#check"));
}

export async function retryCheckAction(form: FormData): Promise<void> {
  const { ctx, actor } = await requireActor();
  const sectionId = String(form.get("sectionId") ?? "");
  await retryCheck(ctx, actor, sectionId);
  redirect(sectionUrl(sectionId, "#check"));
}

export async function completeSectionAction(form: FormData): Promise<void> {
  const { ctx, actor } = await requireActor();
  const sectionId = String(form.get("sectionId") ?? "");
  try {
    await completeSection(ctx, actor, sectionId);
  } catch (e) {
    if (e instanceof LearningError && e.code === "check_required")
      redirect(sectionUrl(sectionId, "?check=required#check"));
    throw e;
  }
  redirect(sectionUrl(sectionId, "?completed=1#complete"));
}

/**
 * Called only when the learner presses Watch/Listen: returns short-lived
 * signed playback tokens (or { available: false } without Mux config).
 */
export async function getPlaybackAction(
  contentItemId: string,
): Promise<PlaybackGrant> {
  const { ctx, actor } = await requireActor();
  await enforceRateLimit(ctx, RATE_LIMITS.mediaPlayback, actor.userId);
  try {
    const item = await getMediaForLearner(ctx, actor, contentItemId);
    return playbackGrant(readMuxConfig(), item.playbackId);
  } catch (e) {
    if (e instanceof LearningError) return { available: false };
    throw e;
  }
}
