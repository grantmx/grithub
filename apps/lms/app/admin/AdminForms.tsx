"use client";

import { useActionState, useState } from "react";
import ui from "@/components/ui.module.css";
import type { ImportRow } from "@/lib/csv";
import {
  type FormState,
  type ImportState,
  confirmImportAction,
  createCohortAction,
  inviteLearnerAction,
  previewImportAction,
  setModerationRateAction,
  startRecoveryAction,
} from "./actions";

function Status({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className={ui.bannerError}>
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p role="status" className={ui.bannerSuccess}>
        {state.success}
      </p>
    );
  }
  return null;
}

export function CreateCohortForm({
  qualifications,
}: {
  qualifications: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState(createCohortAction, {});
  return (
    <form action={action} className={ui.stack} style={{ maxWidth: "36rem" }}>
      <Status state={state} />
      <div className={ui.field}>
        <label className={ui.label} htmlFor="qualificationId">
          Qualification
        </label>
        <select
          id="qualificationId"
          name="qualificationId"
          className={ui.select}
          required
        >
          {qualifications.map((q) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </select>
      </div>
      <div className={ui.field}>
        <label className={ui.label} htmlFor="name">
          Cohort name
        </label>
        <input
          id="name"
          name="name"
          className={ui.input}
          maxLength={120}
          required
        />
      </div>
      <div className={ui.row}>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="startsOn">
            Starts
          </label>
          <input
            id="startsOn"
            name="startsOn"
            type="date"
            className={ui.input}
            required
          />
        </div>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="endsOn">
            Ends
          </label>
          <input
            id="endsOn"
            name="endsOn"
            type="date"
            className={ui.input}
            required
          />
        </div>
      </div>
      <div>
        <button type="submit" className={ui.button} disabled={pending}>
          Create cohort
        </button>
      </div>
    </form>
  );
}

/** Per-cohort moderation sampling rate (design.md §14, 2026-11-08). */
export function ModerationRateForm({
  cohortId,
  cohortName,
  percent,
}: {
  cohortId: string;
  cohortName: string;
  percent: number;
}) {
  const [state, action, pending] = useActionState(setModerationRateAction, {});
  return (
    <form action={action} className={ui.row}>
      <input type="hidden" name="cohortId" value={cohortId} />
      <label className={ui.srOnly} htmlFor={`rate-${cohortId}`}>
        Moderation sampling rate for {cohortName} (percent)
      </label>
      <input
        id={`rate-${cohortId}`}
        name="percent"
        type="number"
        min={1}
        max={100}
        step={1}
        defaultValue={percent}
        className={ui.input}
        style={{ width: "5rem" }}
        required
      />
      <span aria-hidden="true">%</span>
      <button type="submit" className={ui.secondary} disabled={pending}>
        Save
      </button>
      {state.error ? (
        <span role="alert" className={ui.statusBad}>
          {state.error}
        </span>
      ) : state.success ? (
        <span role="status" className={ui.statusOk}>
          ✓ {state.success}
        </span>
      ) : null}
    </form>
  );
}

export function InviteLearnerForm({ cohortId }: { cohortId: string }) {
  const [state, action, pending] = useActionState(inviteLearnerAction, {});
  return (
    <form action={action} className={ui.stack} style={{ maxWidth: "36rem" }}>
      <Status state={state} />
      <input type="hidden" name="cohortId" value={cohortId} />
      <div className={ui.field}>
        <label className={ui.label} htmlFor="name">
          Full name
        </label>
        <input
          id="name"
          name="name"
          className={ui.input}
          maxLength={120}
          required
          autoComplete="off"
        />
      </div>
      <div className={ui.field}>
        <label className={ui.label} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className={ui.input}
          required
          autoComplete="off"
        />
      </div>
      <div>
        <button type="submit" className={ui.button} disabled={pending}>
          Send invitation
        </button>
      </div>
    </form>
  );
}

/**
 * CSV import (design-gate decision: validate, preview, then confirm).
 * The file is read in the browser and sent as text; nothing is saved
 * until the admin confirms, and only valid rows are imported.
 */
export function ImportLearners({
  cohortId,
  cohortName,
}: {
  cohortId: string;
  cohortName: string;
}) {
  const [state, setState] = useState<ImportState>({ stage: "upload" });
  const [csv, setCsv] = useState("");
  const [pending, setPending] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setCsv(await file.text());
  }

  async function preview() {
    setPending(true);
    try {
      setState(await previewImportAction(cohortId, csv));
    } finally {
      setPending(false);
    }
  }

  async function confirm(text: string) {
    setPending(true);
    try {
      setState(await confirmImportAction(cohortId, text));
    } finally {
      setPending(false);
    }
  }

  if (state.stage === "done") {
    return (
      <div className={ui.stack}>
        <p role="status" className={ui.bannerSuccess}>
          Imported {state.imported} learner{state.imported === 1 ? "" : "s"}{" "}
          into {cohortName}; {state.invited} invitation
          {state.invited === 1 ? "" : "s"} sent. {state.skipped} row
          {state.skipped === 1 ? "" : "s"} skipped.
        </p>
        <a className={ui.secondary} href={`/admin/people?cohort=${cohortId}`}>
          Back to people
        </a>
      </div>
    );
  }

  if (state.stage === "preview") {
    const ready = state.rows.filter((r) => r.status.ok).length;
    const errors = state.rows.length - ready;
    return (
      <div className={ui.stack}>
        <p>
          <strong>{ready} ready</strong> · {errors} with errors
        </p>
        <PreviewTable rows={state.rows} />
        <div className={ui.row}>
          <button
            type="button"
            className={ui.secondary}
            onClick={() => setState({ stage: "upload" })}
          >
            Cancel
          </button>
          <button
            type="button"
            className={ui.button}
            disabled={pending || ready === 0}
            onClick={() => confirm(state.csv)}
          >
            Import {ready} learner{ready === 1 ? "" : "s"} and send invites
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={ui.stack} style={{ maxWidth: "48rem" }}>
      {state.error ? (
        <p role="alert" className={ui.bannerError}>
          {state.error}
        </p>
      ) : null}
      <p className={ui.hint}>
        CSV with a header row containing <code>name</code> and{" "}
        <code>email</code>. Up to 500 learners, 200 KB.
      </p>
      <div className={ui.field}>
        <label className={ui.label} htmlFor="csvFile">
          Choose a CSV file
        </label>
        <input
          id="csvFile"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
      <div className={ui.field}>
        <label className={ui.label} htmlFor="csvText">
          …or paste the CSV
        </label>
        <textarea
          id="csvText"
          className={ui.textarea}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          spellCheck={false}
        />
      </div>
      <div>
        <button
          type="button"
          className={ui.button}
          disabled={pending || !csv.trim()}
          onClick={preview}
        >
          Check file
        </button>
      </div>
    </div>
  );
}

function PreviewTable({ rows }: { rows: ImportRow[] }) {
  return (
    <div className={ui.tableWrap}>
      <table className={ui.table}>
        <thead>
          <tr>
            <th scope="col">Row</th>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.row}>
              <td>{r.row}</td>
              <td>{r.name || <span className={ui.muted}>(blank)</span>}</td>
              <td>{r.email || <span className={ui.muted}>(blank)</span>}</td>
              <td className={r.status.ok ? ui.statusOk : ui.statusBad}>
                {r.status.ok ? "✓ Ready" : `✗ ${r.status.error}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RecoveryForm({
  userId,
  methods,
}: {
  userId: string;
  methods: { value: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(startRecoveryAction, {});
  if (state.success) return <Status state={state} />;
  return (
    <form action={action} className={ui.stack} style={{ maxWidth: "36rem" }}>
      <Status state={state} />
      <input type="hidden" name="userId" value={userId} />
      <fieldset
        className={ui.stack}
        style={{ border: 0, padding: 0, margin: 0 }}
      >
        <legend className={ui.label}>
          How did you verify this person&apos;s identity?
        </legend>
        {methods.map((m) => (
          <label key={m.value} className={ui.checkbox}>
            <input
              type="radio"
              name="verificationMethod"
              value={m.value}
              required
            />
            <span>{m.label}</span>
          </label>
        ))}
      </fieldset>
      <div className={ui.field}>
        <label className={ui.label} htmlFor="reason">
          Reason
        </label>
        <textarea
          id="reason"
          name="reason"
          className={ui.input}
          minLength={5}
          maxLength={500}
          required
          rows={3}
        />
        <p className={ui.hint}>
          For example: &quot;Phone lost; verified in person at the hub.&quot;
          Saved in the audit log.
        </p>
      </div>
      <p className={ui.bannerInfo}>
        This revokes <strong>all</strong> of their passkeys, signs them out
        everywhere, and emails a single-use recovery link that expires in 30
        minutes.
      </p>
      <div>
        <button type="submit" className={ui.danger} disabled={pending}>
          Start recovery
        </button>
      </div>
    </form>
  );
}
