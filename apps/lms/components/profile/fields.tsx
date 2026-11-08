"use client";

import { useEffect, useId, useRef, useState } from "react";
import ui from "@/components/ui.module.css";
import type { CodeOption, FieldErrors } from "@/lib/qctoProfile";
import styles from "./profile.module.css";

/**
 * Form fields for the QCTO profile (design.md §10: labels always visible,
 * errors in text next to the field and summarised at the top).
 */

const errId = (name: string) => `${name.replace(/\./g, "-")}-error`;
const hintId = (name: string) => `${name.replace(/\./g, "-")}-hint`;
export const fieldId = (name: string) => name.replace(/\./g, "-");

function describedBy(name: string, hint?: string, error?: string) {
  return (
    [hint ? hintId(name) : "", error ? errId(name) : ""]
      .filter(Boolean)
      .join(" ") || undefined
  );
}

function Message({
  name,
  hint,
  error,
}: {
  name: string;
  hint?: string;
  error?: string;
}) {
  return (
    <>
      {hint ? (
        <p id={hintId(name)} className={ui.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errId(name)} className={styles.error}>
          <span aria-hidden="true">! </span>
          {error}
        </p>
      ) : null}
    </>
  );
}

/** "Please correct…" banner listing every field error as a link. */
export function ErrorSummary({
  message,
  errors,
  labels,
}: {
  message?: string;
  errors?: FieldErrors;
  labels: Record<string, string>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (message) ref.current?.focus();
  }, [message, errors]);
  if (!message) return null;
  const entries = Object.entries(errors ?? {});
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className={`${ui.bannerError} ${styles.summary}`}
    >
      <p style={{ margin: 0 }}>{message}</p>
      {entries.length > 0 ? (
        <ul>
          {entries.map(([name, text]) => (
            <li key={name}>
              <a href={`#${fieldId(name)}`}>
                {labels[name] ? `${labels[name]}: ` : ""}
                {text}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function TextField({
  name,
  label,
  hint,
  error,
  defaultValue,
  optional,
  ...input
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  defaultValue?: string;
  optional?: boolean;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "name" | "defaultValue" | "id"
>) {
  return (
    <div className={ui.field}>
      <label htmlFor={fieldId(name)} className={ui.label}>
        {label}
        {optional ? <span className={ui.hint}> (optional)</span> : null}
      </label>
      <input
        id={fieldId(name)}
        name={name}
        defaultValue={defaultValue}
        className={`${ui.input} ${error ? styles.invalid : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        {...input}
      />
      <Message name={name} hint={hint} error={error} />
    </div>
  );
}

export function RadioGroup({
  name,
  legend,
  options,
  value,
  defaultValue,
  onChange,
  hint,
  error,
}: {
  name: string;
  legend: string;
  options: CodeOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (code: string) => void;
  hint?: string;
  error?: string;
}) {
  return (
    <fieldset
      className={styles.fieldset}
      id={fieldId(name)}
      tabIndex={-1}
      aria-describedby={describedBy(name, hint, error)}
    >
      <legend className={styles.legend}>{legend}</legend>
      <Message name={name} hint={hint} error={error} />
      <div className={styles.radios}>
        {options.map((o) => (
          <label key={o.code} className={styles.radio}>
            <input
              type="radio"
              name={name}
              value={o.code}
              {...(value !== undefined
                ? {
                    checked: value === o.code,
                    onChange: () => onChange?.(o.code),
                  }
                : {
                    defaultChecked: defaultValue === o.code,
                    onChange: () => onChange?.(o.code),
                  })}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SelectField({
  name,
  label,
  options,
  value,
  defaultValue,
  onChange,
  hint,
  error,
}: {
  name: string;
  label: string;
  options: CodeOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (code: string) => void;
  hint?: string;
  error?: string;
}) {
  const controlled =
    value !== undefined
      ? {
          value,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
            onChange?.(e.target.value),
        }
      : {
          defaultValue: defaultValue ?? "",
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
            onChange?.(e.target.value),
        };
  return (
    <div className={ui.field}>
      <label htmlFor={fieldId(name)} className={ui.label}>
        {label}
      </label>
      <select
        id={fieldId(name)}
        name={name}
        className={`${ui.select} ${error ? styles.invalid : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        {...controlled}
      >
        <option value="">Choose…</option>
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.label}
          </option>
        ))}
      </select>
      <Message name={name} hint={hint} error={error} />
    </div>
  );
}

type Area = { code: string; label: string };

/**
 * Stats SA area type-ahead (ARIA combobox). Searches /api/qcto/areas within
 * the chosen province; the chosen code is posted in a hidden input.
 */
export function AreaPicker({
  name,
  province,
  initial,
  error,
}: {
  name: string;
  province: string;
  initial: Area | null;
  error?: string;
}) {
  const listId = useId();
  const [chosen, setChosen] = useState<Area | null>(initial);
  const [query, setQuery] = useState(initial?.label ?? "");
  const [results, setResults] = useState<Area[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState("");
  const lastProvince = useRef(province);

  // A new province clears the area (it must lie in the province).
  useEffect(() => {
    if (lastProvince.current !== province) {
      lastProvince.current = province;
      setChosen(null);
      setQuery("");
      setResults([]);
    }
  }, [province]);

  useEffect(() => {
    if (chosen && query === chosen.label) return;
    const q = query.trim();
    if (q.length < 2 || !province) {
      setResults([]);
      setStatus(q.length > 0 ? "Type at least 2 letters." : "");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/qcto/areas?province=${encodeURIComponent(province)}&q=${encodeURIComponent(q)}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { areas: Area[] };
        setResults(body.areas);
        setActive(-1);
        setOpen(true);
        setStatus(
          body.areas.length === 0
            ? "No areas match. Try your suburb, town or village name."
            : `${body.areas.length} areas found. Use the arrow keys to choose.`,
        );
      } catch (e) {
        if ((e as Error).name !== "AbortError")
          setStatus("Couldn't search right now. Please try again.");
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, province, chosen]);

  const pick = (a: Area) => {
    setChosen(a);
    setQuery(a.label);
    setOpen(false);
    setStatus(`Chosen: ${a.label}`);
  };

  return (
    <div className={ui.field}>
      <label htmlFor={fieldId(name)} className={ui.label}>
        Area where you live
      </label>
      <p id={hintId(name)} className={ui.hint}>
        {province
          ? "Start typing your suburb, town or village, then choose it from the list."
          : "Choose your province first."}
      </p>
      <div className={styles.combo}>
        <input
          id={fieldId(name)}
          type="text"
          role="combobox"
          autoComplete="off"
          disabled={!province}
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            active >= 0 ? `${listId}-${active}` : undefined
          }
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(name, "hint", error)}
          className={`${ui.input} ${error ? styles.invalid : ""}`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setChosen(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && open && active >= 0) {
              e.preventDefault();
              const a = results[active];
              if (a) pick(a);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {open && results.length > 0 ? (
          <ul id={listId} role="listbox" className={styles.options}>
            {results.map((a, i) => (
              <li
                key={a.code}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={styles.option}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(a);
                }}
              >
                {a.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <input type="hidden" name={name} value={chosen?.code ?? ""} />
      <input type="hidden" name={`${name}Label`} value={chosen?.label ?? ""} />
      <p className={ui.hint} aria-live="polite">
        {status}
      </p>
      <noscript>
        <p className={ui.hint}>
          Searching for your area needs JavaScript. Please turn it on, or ask
          your facilitator to fill this in.
        </p>
      </noscript>
      <Message name={name} error={error} />
    </div>
  );
}
