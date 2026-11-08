"use server";

import { redirect } from "next/navigation";
import {
  OnboardingError,
  acceptNotice,
  confirmDetails,
} from "@/lib/server/onboarding";
import {
  PROFILE_PARTS,
  type FieldErrors,
  type ProfilePart,
  type ProfileValues,
  emptyProfile,
  readPartFromForm,
} from "@/lib/qctoProfile";
import {
  ProfileError,
  confirmOwnProfile,
  saveOwnProfilePart,
} from "@/lib/server/qctoProfile";
import { RateLimitError } from "@/lib/server/ratelimit";
import { getActor, getServerCtx } from "@/lib/server/request";

export type FormState = { error?: string };

const message = (e: unknown) =>
  e instanceof OnboardingError ||
  e instanceof RateLimitError ||
  e instanceof ProfileError
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
      qctoVersion: String(form.get("qctoVersion") ?? ""),
      qctoSharing: form.get("qctoSharing") === "yes",
    });
  } catch (e) {
    return { error: message(e) };
  }
  redirect("/setup");
}

export type ProfileFormState = {
  error?: string;
  fieldErrors?: FieldErrors;
  /** What the learner typed, so a failed save doesn't clear the form. */
  values?: ProfileValues;
  /** Label of the area the learner picked (shown again after a failed save). */
  areaLabel?: string;
  /** Changes on every failed submit so the form remounts with `values`. */
  attempt?: number;
};

/** Save one part of the QCTO profile, then go to the next part. */
export async function saveProfilePart(
  prev: ProfileFormState,
  form: FormData,
): Promise<ProfileFormState> {
  const part = String(form.get("part") ?? "") as ProfilePart;
  if (!PROFILE_PARTS.includes(part)) return { error: message(null) };
  let next: ProfilePart | "review";
  try {
    const ctx = await getServerCtx();
    ({ next } = await saveOwnProfilePart(ctx, await getActor(ctx), part, form));
  } catch (e) {
    return {
      error: message(e),
      fieldErrors: e instanceof ProfileError ? e.fieldErrors : undefined,
      values: readPartFromForm(form, part, emptyProfile()),
      areaLabel: String(form.get("statssaAreaCodeLabel") ?? "").slice(0, 200),
      attempt: (prev.attempt ?? 0) + 1,
    };
  }
  redirect(`/setup?part=${next}`);
}

export async function confirmProfile(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    const ctx = await getServerCtx();
    await confirmOwnProfile(
      ctx,
      await getActor(ctx),
      form.get("confirm") === "yes",
    );
  } catch (e) {
    return { error: message(e) };
  }
  redirect("/setup");
}
