"use server";

import { redirect } from "next/navigation";
import type { ImportRow } from "@/lib/csv";
import { AccessDeniedError } from "@/lib/server/auth";
import {
  OnboardingError,
  confirmLearnerImport,
  createCohort,
  deactivateUser,
  inviteLearner,
  previewLearnerImport,
  resendInvitation,
  setModerationRate,
  startRecovery,
} from "@/lib/server/onboarding";
import { getActor, getServerCtx } from "@/lib/server/request";

/**
 * Admin server actions. Each one goes through `authorize` (SDP admin AND an
 * active passkey) inside lib/server/onboarding.ts, in addition to the proxy.
 * No personal data is ever logged here.
 */

export type FormState = { error?: string; success?: string };

async function run<T>(
  fn: (ctx: Awaited<ReturnType<typeof getServerCtx>>) => Promise<T>,
): Promise<T> {
  const ctx = await getServerCtx();
  try {
    return await fn(ctx);
  } catch (e) {
    if (e instanceof AccessDeniedError) {
      redirect(
        e.decision.result === "stepup"
          ? "/account/passkeys?required=1&next=/admin/people"
          : "/forbidden",
      );
    }
    throw e;
  }
}

const fail = (e: unknown): FormState => {
  if (e instanceof OnboardingError) return { error: e.message };
  throw e;
};

export async function createCohortAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    await run(async (ctx) =>
      createCohort(ctx, await getActor(ctx), {
        qualificationId: String(form.get("qualificationId") ?? ""),
        name: String(form.get("name") ?? ""),
        startsOn: String(form.get("startsOn") ?? ""),
        endsOn: String(form.get("endsOn") ?? ""),
      }),
    );
  } catch (e) {
    return fail(e);
  }
  return { success: "Cohort created." };
}

export async function setModerationRateAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const raw = String(form.get("percent") ?? "").trim();
  try {
    await run(async (ctx) =>
      setModerationRate(
        ctx,
        await getActor(ctx),
        String(form.get("cohortId") ?? ""),
        /^\d+$/.test(raw) ? Number(raw) : NaN,
      ),
    );
  } catch (e) {
    return fail(e);
  }
  return { success: "Saved." };
}

export async function inviteLearnerAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const cohortId = String(form.get("cohortId") ?? "");
  let invited: boolean;
  try {
    ({ invited } = await run(async (ctx) =>
      inviteLearner(ctx, await getActor(ctx), {
        cohortId,
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
      }),
    ));
  } catch (e) {
    return fail(e);
  }
  return {
    success: invited
      ? "Invitation sent."
      : "Existing learner enrolled (no invitation needed).",
  };
}

export type ImportState =
  | { stage: "upload"; error?: string }
  | { stage: "preview"; csv: string; rows: ImportRow[] }
  | { stage: "done"; imported: number; invited: number; skipped: number };

export async function previewImportAction(
  cohortId: string,
  csv: string,
): Promise<ImportState> {
  const result = await run(async (ctx) =>
    previewLearnerImport(ctx, await getActor(ctx), cohortId, csv),
  );
  if (!result.ok) return { stage: "upload", error: result.error };
  return { stage: "preview", csv, rows: result.rows };
}

export async function confirmImportAction(
  cohortId: string,
  csv: string,
): Promise<ImportState> {
  try {
    const summary = await run(async (ctx) =>
      confirmLearnerImport(ctx, await getActor(ctx), cohortId, csv),
    );
    return { stage: "done", ...summary };
  } catch (e) {
    if (e instanceof OnboardingError)
      return { stage: "upload", error: e.message };
    throw e;
  }
}

export async function resendInviteAction(form: FormData): Promise<void> {
  const cohortId = String(form.get("cohortId") ?? "");
  try {
    await run(async (ctx) =>
      resendInvitation(
        ctx,
        await getActor(ctx),
        String(form.get("userId") ?? ""),
        cohortId,
      ),
    );
  } catch (e) {
    if (e instanceof OnboardingError)
      redirect(`/admin/people?cohort=${cohortId}&error=resend`);
    throw e;
  }
  redirect(`/admin/people?cohort=${cohortId}&done=resent`);
}

export async function deactivateAction(form: FormData): Promise<void> {
  const cohortId = String(form.get("cohortId") ?? "");
  try {
    await run(async (ctx) =>
      deactivateUser(
        ctx,
        await getActor(ctx),
        String(form.get("userId") ?? ""),
      ),
    );
  } catch (e) {
    if (e instanceof OnboardingError)
      redirect(`/admin/people?cohort=${cohortId}&error=deactivate`);
    throw e;
  }
  redirect(`/admin/people?cohort=${cohortId}&done=deactivated`);
}

export async function startRecoveryAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    await run(async (ctx) =>
      startRecovery(ctx, await getActor(ctx), {
        userId: String(form.get("userId") ?? ""),
        verificationMethod: String(form.get("verificationMethod") ?? ""),
        reason: String(form.get("reason") ?? ""),
      }),
    );
  } catch (e) {
    return fail(e);
  }
  return {
    success:
      "Recovery started. Their passkeys and sessions were revoked and a recovery link was emailed.",
  };
}
