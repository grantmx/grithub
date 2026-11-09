import ui from "@/components/ui.module.css";

/** Result line after a form post (?done= / ?error=). TODO(copy): wording from GRIT Hub. */
export function StatusBanner({ done, error, messages }: { done?: string; error?: string; messages: Record<string, string> }) {
  return (
    <>
      {done && messages[done] ? (
        <p role="status" className={ui.bannerSuccess}>
          {messages[done]}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className={ui.bannerError}>
          {error}
        </p>
      ) : null}
    </>
  );
}

/** GET form to switch cohort, like the Learner progress page. */
export function CohortPicker({
  title,
  cohorts,
  selected,
  extra,
}: {
  title: string;
  cohorts: { id: string; name: string }[];
  selected: string;
  extra?: Record<string, string>;
}) {
  return (
    <form method="get" className={ui.row}>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        {title} ·
      </h1>
      {Object.entries(extra ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label htmlFor="cohort" className={ui.srOnly}>
        Cohort
      </label>
      <select id="cohort" name="cohort" className={ui.select} defaultValue={selected} style={{ width: "auto" }}>
        {cohorts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button type="submit" className={ui.secondary}>
        Show
      </button>
    </form>
  );
}

export const SAST = "Africa/Johannesburg";
export const dateTimeFmt = new Intl.DateTimeFormat("en-ZA", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: SAST,
});
export const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeZone: SAST });
export const longDateTimeFmt = new Intl.DateTimeFormat("en-ZA", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: SAST,
});

export function NoCohorts({ title }: { title: string }) {
  return (
    <>
      <h1 className={ui.h1}>{title}</h1>
      <p className={ui.muted}>You aren&apos;t assigned to any cohorts yet.</p>
    </>
  );
}
