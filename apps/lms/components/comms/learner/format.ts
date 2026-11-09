/** Dates for learner communication screens, always in South African time. */
const tz = "Africa/Johannesburg";

const dateTime = new Intl.DateTimeFormat("en-ZA", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: tz,
});
const longDateTime = new Intl.DateTimeFormat("en-ZA", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: tz,
});
const time = new Intl.DateTimeFormat("en-ZA", { hour: "2-digit", minute: "2-digit", timeZone: tz });

export const fmtDateTime = (d: Date) => dateTime.format(d);
export const fmtWhen = (d: Date) => longDateTime.format(d);
export const fmtTime = (d: Date) => time.format(d);
/** "Tue 10 Nov, 18:00–19:00" */
export const fmtRange = (start: Date, end: Date) => `${longDateTime.format(start)}–${time.format(end)}`;
