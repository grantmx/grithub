"use server";

import { redirect } from "next/navigation";
import {
  type FieldErrors,
  PROFILE_PARTS,
  type ProfileValues,
  emptyProfile,
  readPartFromForm,
} from "@/lib/qctoProfile";
import { AccessDeniedError } from "@/lib/server/auth";
import { ProfileError, adminSaveProfile } from "@/lib/server/qctoProfile";
import { InputError, checkForm, id, text } from "@/lib/server/input";
import { getActor, getServerCtx } from "@/lib/server/request";

export type AdminProfileState = {
  error?: string;
  success?: string;
  fieldErrors?: FieldErrors;
  values?: ProfileValues;
  areaLabel?: string;
  attempt?: number;
};

/** SDP admin fills in or corrects a learner's QCTO profile (audited, field names only). */
export async function saveLearnerProfile(
  prev: AdminProfileState,
  form: FormData,
): Promise<AdminProfileState> {
  const attempt = (prev.attempt ?? 0) + 1;
  let userId: string;
  try {
    // The whole form goes to the domain layer, so check every field's shape first.
    checkForm(form);
    userId = id(form, "userId");
  } catch (e) {
    if (e instanceof InputError) return { error: e.message, attempt };
    throw e;
  }
  const ctx = await getServerCtx();
  try {
    const values = await adminSaveProfile(
      ctx,
      await getActor(ctx),
      userId,
      form,
    );
    return {
      success: "Saved.",
      values,
      areaLabel: text(form, "statssaAreaCodeLabel").slice(0, 200),
      attempt,
    };
  } catch (e) {
    if (e instanceof AccessDeniedError) {
      redirect(
        e.decision.result === "stepup"
          ? `/account/passkeys?required=1&next=/admin/people/${userId}/profile`
          : "/forbidden",
      );
    }
    if (e instanceof ProfileError) {
      let typed = emptyProfile();
      for (const part of PROFILE_PARTS)
        typed = readPartFromForm(form, part, typed);
      return {
        error: e.message,
        fieldErrors: e.fieldErrors,
        values: typed,
        areaLabel: text(form, "statssaAreaCodeLabel").slice(0, 200),
        attempt,
      };
    }
    return { error: "Something went wrong. Please try again.", attempt };
  }
}
