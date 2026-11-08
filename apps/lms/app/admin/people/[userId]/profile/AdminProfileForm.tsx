"use client";

import { useActionState } from "react";
import { ErrorSummary } from "@/components/profile/fields";
import {
  AboutFields,
  BackgroundFields,
  ContactFields,
  FIELD_LABELS,
} from "@/components/profile/ProfileParts";
import styles from "@/components/profile/profile.module.css";
import ui from "@/components/ui.module.css";
import type { CodeLists, ProfileValues } from "@/lib/qctoProfile";
import { type AdminProfileState, saveLearnerProfile } from "./actions";

/**
 * All profile groups on one page (design gate: dense staff layout + Save).
 * Fields may be left empty; whatever is filled in must be valid.
 */
export function AdminProfileForm({
  userId,
  values,
  lists,
  initialArea,
  email,
}: {
  userId: string;
  values: ProfileValues;
  lists: CodeLists;
  initialArea: { code: string; label: string } | null;
  email: string;
}) {
  const [state, action, pending] = useActionState<AdminProfileState, FormData>(
    saveLearnerProfile,
    {},
  );
  const v = state.values ?? values;
  const errors = state.fieldErrors ?? {};
  const area = state.values
    ? v.statssaAreaCode
      ? { code: v.statssaAreaCode, label: state.areaLabel || v.statssaAreaCode }
      : null
    : initialArea;
  return (
    <form
      key={state.attempt ?? 0}
      action={action}
      className={ui.stack}
      noValidate
    >
      <ErrorSummary
        message={state.error}
        errors={errors}
        labels={FIELD_LABELS}
      />
      {state.success ? (
        <p role="status" className={ui.bannerSuccess}>
          {state.success}
        </p>
      ) : null}
      <input type="hidden" name="userId" value={userId} />
      <h2 className={styles.groupTitle}>About the learner</h2>
      <AboutFields values={v} lists={lists} errors={errors} />
      <h2 className={styles.groupTitle}>Contact & address</h2>
      <ContactFields
        values={v}
        lists={lists}
        errors={errors}
        initialArea={area}
        email={email}
      />
      <h2 className={styles.groupTitle}>Background</h2>
      <BackgroundFields values={v} lists={lists} errors={errors} />
      <div className={ui.row}>
        <button type="submit" className={ui.button} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
