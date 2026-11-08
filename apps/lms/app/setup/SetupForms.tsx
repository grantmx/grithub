"use client";

import { useActionState } from "react";
import { ErrorSummary } from "@/components/profile/fields";
import {
  AboutFields,
  BackgroundFields,
  ContactFields,
  FIELD_LABELS,
} from "@/components/profile/ProfileParts";
import ui from "@/components/ui.module.css";
import type { CodeLists, ProfilePart, ProfileValues } from "@/lib/qctoProfile";
import type { SharingConsent } from "@/lib/popia";
import {
  type ProfileFormState,
  confirmProfile,
  saveConsent,
  saveDetails,
  saveProfilePart,
} from "./actions";

export function DetailsForm({
  displayName,
  email,
}: {
  displayName: string;
  email: string;
}) {
  const [state, action, pending] = useActionState(saveDetails, {});
  return (
    <form action={action} className={ui.stack}>
      {state.error ? (
        <p role="alert" className={ui.bannerError}>
          {state.error}
        </p>
      ) : null}
      <div className={ui.field}>
        <label htmlFor="displayName" className={ui.label}>
          Your name
        </label>
        <input
          id="displayName"
          name="displayName"
          className={ui.input}
          defaultValue={displayName}
          maxLength={120}
          required
          autoComplete="name"
        />
      </div>
      <div className={ui.field}>
        <span className={ui.label}>Email</span>
        <p className={ui.muted}>{email}</p>
        <p className={ui.hint}>
          If this is wrong, contact your facilitator before continuing.
        </p>
      </div>
      <div className={ui.row}>
        <button type="submit" className={ui.button} disabled={pending}>
          Continue →
        </button>
      </div>
    </form>
  );
}

export function ConsentForm({
  version,
  qcto,
  backHref,
}: {
  version: string;
  /** Learners only: the separate QCTO sharing consent. */
  qcto?: SharingConsent;
  backHref: string;
}) {
  const [state, action, pending] = useActionState(saveConsent, {});
  return (
    <form action={action} className={ui.stack}>
      {state.error ? (
        <p role="alert" className={ui.bannerError}>
          {state.error}
        </p>
      ) : null}
      <input type="hidden" name="noticeVersion" value={version} />
      <label className={ui.checkbox}>
        <input type="checkbox" name="accept" value="yes" required />
        <span>
          I have read this notice and I agree to the processing of my personal
          information as described.
        </span>
      </label>
      {qcto ? (
        <>
          <input type="hidden" name="qctoVersion" value={qcto.version} />
          <label className={ui.checkbox}>
            <input
              type="checkbox"
              name="qctoSharing"
              value="yes"
              required
              aria-describedby="qcto-why"
            />
            <span>{qcto.statement}</span>
          </label>
          <p id="qcto-why" className={ui.hint}>
            {qcto.whyRequired}
          </p>
        </>
      ) : null}
      <div className={ui.spread}>
        <a href={backHref} className={ui.secondary}>
          ← Back
        </a>
        <button type="submit" className={ui.button} disabled={pending}>
          Continue →
        </button>
      </div>
    </form>
  );
}

/** One part of the QCTO profile step; saved on Continue. */
export function ProfilePartForm({
  part,
  values,
  lists,
  initialArea,
  email,
  backHref,
}: {
  part: ProfilePart;
  values: ProfileValues;
  lists: CodeLists;
  initialArea: { code: string; label: string } | null;
  email: string;
  backHref: string;
}) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(
    saveProfilePart,
    {},
  );
  const v = state.values ?? values;
  const errors = state.fieldErrors ?? {};
  const area =
    state.values && v.statssaAreaCode
      ? { code: v.statssaAreaCode, label: state.areaLabel || v.statssaAreaCode }
      : state.values
        ? null
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
      <input type="hidden" name="part" value={part} />
      {part === "about" ? (
        <AboutFields values={v} lists={lists} errors={errors} />
      ) : part === "contact" ? (
        <ContactFields
          values={v}
          lists={lists}
          errors={errors}
          initialArea={area}
          email={email}
        />
      ) : (
        <BackgroundFields values={v} lists={lists} errors={errors} />
      )}
      <div className={ui.spread}>
        <a href={backHref} className={ui.secondary}>
          ← Back
        </a>
        <button type="submit" className={ui.button} disabled={pending}>
          {pending ? "Saving…" : "Continue →"}
        </button>
      </div>
    </form>
  );
}

export function ConfirmProfileForm({ backHref }: { backHref: string }) {
  const [state, action, pending] = useActionState(confirmProfile, {});
  return (
    <form action={action} className={ui.stack}>
      {state.error ? (
        <p role="alert" className={ui.bannerError}>
          {state.error}
        </p>
      ) : null}
      <label className={ui.checkbox}>
        <input type="checkbox" name="confirm" value="yes" required />
        <span>These details are correct and match my identity document.</span>
      </label>
      <p className={ui.hint}>
        After you confirm, only your facilitator or the training provider can
        change them.
      </p>
      <div className={ui.spread}>
        <a href={backHref} className={ui.secondary}>
          ← Back
        </a>
        <button type="submit" className={ui.button} disabled={pending}>
          Confirm →
        </button>
      </div>
    </form>
  );
}
