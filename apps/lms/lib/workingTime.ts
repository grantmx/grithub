/**
 * Working time for support-ticket targets (design.md §14, 2026-11-08):
 * Monday to Friday, 08:00–17:00 South African time (UTC+2, no daylight
 * saving), skipping South African public holidays. One working day is the
 * 9 working hours from opening to closing.
 */

const SAST_OFFSET_MS = 2 * 3_600_000;
const OPEN_HOUR = 8;
const CLOSE_HOUR = 17;
export const WORKING_HOURS_PER_DAY = CLOSE_HOUR - OPEN_HOUR;

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** Easter Sunday (Gregorian), as [month, day]. */
function easter(year: number): [number, number] {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return [month, day];
}

const holidayCache = new Map<number, Set<string>>();

/**
 * South African public holidays for a year (Public Holidays Act 36 of 1994):
 * the fixed dates, Good Friday and Family Day, and the Monday after any
 * holiday that falls on a Sunday. One-off proclaimed holidays (e.g. election
 * days) are not included.
 */
export function saPublicHolidays(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const fixed: [number, number][] = [
    [1, 1],
    [3, 21],
    [4, 27],
    [5, 1],
    [6, 16],
    [8, 9],
    [9, 24],
    [12, 16],
    [12, 25],
    [12, 26],
  ];
  const days = new Set<string>();
  for (const [m, d] of fixed) {
    days.add(ymd(year, m, d));
    if (new Date(Date.UTC(year, m - 1, d)).getUTCDay() === 0) {
      const next = new Date(Date.UTC(year, m - 1, d + 1));
      days.add(ymd(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()));
    }
  }
  const [em, ed] = easter(year);
  for (const offset of [-2, 1]) {
    const x = new Date(Date.UTC(year, em - 1, ed + offset));
    days.add(ymd(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()));
  }
  holidayCache.set(year, days);
  return days;
}

/** True for a Monday–Friday that is not a public holiday (date given as local SA midnight, in UTC fields). */
function isWorkingDay(local: Date): boolean {
  const dow = local.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  const key = ymd(local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate());
  return !saPublicHolidays(local.getUTCFullYear()).has(key);
}

/** `start` plus `hours` working hours. Outside working hours the clock starts at the next opening. */
export function addWorkingHours(start: Date, hours: number): Date {
  let remaining = Math.round(hours * 60) * 60_000;
  // Work in "local" time: SA wall-clock values held in the UTC fields.
  let cursor = new Date(start.getTime() + SAST_OFFSET_MS);
  const dayAt = (d: Date, hour: number) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour));
  const nextOpening = (d: Date) => {
    const next = dayAt(d, OPEN_HOUR);
    next.setUTCDate(next.getUTCDate() + 1);
    return next;
  };
  for (let guard = 0; guard < 10_000; guard++) {
    if (!isWorkingDay(cursor)) {
      cursor = nextOpening(cursor);
      continue;
    }
    const open = dayAt(cursor, OPEN_HOUR);
    const close = dayAt(cursor, CLOSE_HOUR);
    if (cursor < open) cursor = open;
    if (cursor >= close) {
      cursor = nextOpening(cursor);
      continue;
    }
    const available = close.getTime() - cursor.getTime();
    if (remaining <= available) {
      return new Date(cursor.getTime() + remaining - SAST_OFFSET_MS);
    }
    remaining -= available;
    cursor = nextOpening(cursor);
  }
  throw new Error("addWorkingHours: no working time found");
}

/** Plain countdown label for staff lists: "Due in 3 h", "Overdue 1 day" (wall-clock time). */
export function dueLabel(due: Date, now: Date): { overdue: boolean; text: string } {
  const diff = due.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / 3_600_000);
  const amount =
    hours < 1
      ? `${Math.max(1, Math.round(abs / 60_000))} min`
      : hours < 24
        ? `${hours} h`
        : `${Math.floor(hours / 24)} day${Math.floor(hours / 24) === 1 ? "" : "s"}`;
  return diff >= 0 ? { overdue: false, text: `Due in ${amount}` } : { overdue: true, text: `Overdue ${amount}` };
}
