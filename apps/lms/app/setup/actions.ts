"use server";

import { redirect } from "next/navigation";
import {
  OnboardingError,
  acceptNotice,
  confirmDetails,
} from "@/lib/server/onboarding";
import { RateLimitError } from "@/lib/server/ratelimit";
import { getActor, getServerCtx } from "@/lib/server/request";

export type FormState = { error?: string };

const message = (e: unknown) =>
  e instanceof OnboardingError || e instanceof RateLimitError
    ? e.message
    : "Something went wrong. Please try again.";

export async function saveDetails(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    const ctx = await getServerCtx();
    await confirmDetails(
      ctx,
      await getActor(ctx),
      String(form.get("displayName") ?? ""),
    );
  } catch (e) {
    return { error: message(e) };
  }
  redirect("/setup?step=2");
}

export async function saveConsent(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    const ctx = await getServerCtx();
    await acceptNotice(ctx, await getActor(ctx), {
      version: String(form.get("noticeVersion") ?? ""),
      accepted: form.get("accept") === "yes",
    });
  } catch (e) {
    return { error: message(e) };
  }
  redirect("/setup");
}
