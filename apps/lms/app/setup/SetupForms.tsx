"use client";

import { useActionState } from "react";
import ui from "@/components/ui.module.css";
import { saveConsent, saveDetails } from "./actions";

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

export function ConsentForm({ version }: { version: string }) {
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
          I have read this notice and I agree to GRIT Hub processing my personal
          information as described.
        </span>
      </label>
      <div className={ui.spread}>
        <a href="/setup?step=1" className={ui.secondary}>
          ← Back
        </a>
        <button type="submit" className={ui.button} disabled={pending}>
          Continue →
        </button>
      </div>
    </form>
  );
}
