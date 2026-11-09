import { checkLink } from "./evidenceRules";

/**
 * Pure rules for communication and support (design.md §14, 2026-11-08).
 * Server modules in lib/server/* apply them; tests cover them directly.
 */

/** Learners may edit their own reply or message for 15 minutes; no self-delete. */
export const EDIT_WINDOW_MS = 15 * 60_000;

export const MAX_BODY = 5000;
export const MAX_TITLE = 200;

/** Ticket targets in working hours (1 working day = 9 h; lib/workingTime.ts). */
export const TICKET_FIRST_REPLY_HOURS = 9;
export const TICKET_RESOLVE_HOURS = 45;

/** At-risk rules (design.md §14, 2026-11-08). */
export const INACTIVE_DAYS = 7;
export const FAILED_SECTIONS_THRESHOLD = 2;
export const FAILED_WINDOW_DAYS = 14;

export type CleanText = { ok: true; value: string } | { ok: false; problem: string };

/** Trim, normalise line endings, drop control characters, and check the length. */
export function cleanText(raw: unknown, { max = MAX_BODY, min = 1, label = "Your message" } = {}): CleanText {
  const value = String(raw ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
  if (value.length < min) return { ok: false, problem: `${label} can't be empty.` };
  if (value.length > max) return { ok: false, problem: `${label} is too long (${value.length} of ${max} characters).` };
  return { ok: true, value };
}

export type UrlCheck = { ok: true; url: string; label: string } | { ok: false; problem: string };

function zoomHost(host: string) {
  return host === "zoom.us" || host.endsWith(".zoom.us");
}

/** Live-session join links must be Zoom (Form 5 4.2.8). */
export function checkZoomLink(raw: string): UrlCheck {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return { ok: false, problem: "That isn't a web address. Paste the full Zoom link, starting with https://" };
  }
  if (u.protocol !== "https:") return { ok: false, problem: "Zoom links must start with https://" };
  if (u.username || u.password) return { ok: false, problem: "Links can't contain a username or password." };
  if (u.toString().length > 2000) return { ok: false, problem: "That link is too long." };
  if (!zoomHost(u.hostname.toLowerCase().replace(/\.$/, "")))
    return { ok: false, problem: "Use a Zoom meeting link (zoom.us)." };
  return { ok: true, url: u.toString(), label: "Zoom" };
}

/** Recordings: a Zoom cloud link or a host on the practical-evidence allow-list. */
export function checkRecordingLink(raw: string): UrlCheck {
  const zoom = checkZoomLink(raw);
  if (zoom.ok) return zoom;
  const other = checkLink(raw);
  if (other.ok) return { ok: true, url: other.url, label: other.label };
  return { ok: false, problem: `${other.problem} Zoom cloud recordings are also fine.` };
}

/** Within the learner's 15-minute edit window? */
export function canEditOwn(createdAt: Date, now: Date): boolean {
  return now.getTime() - createdAt.getTime() <= EDIT_WINDOW_MS;
}

// ---------------------------------------------------------------------------
// At-risk flags (staff only; the learner never sees a risk label)
// ---------------------------------------------------------------------------

export type RiskInput = {
  enrolledAt: Date;
  /** Latest section view, check answer or submitted work. */
  lastActivityAt: Date | null;
  /** When each section with all 3 check tries wrong was failed (time of the last try). */
  failedSectionsAt: Date[];
};

export type RiskReason =
  | { kind: "inactive"; days: number; since: Date | null }
  | { kind: "failed_checks"; sections: number };

const DAY_MS = 86_400_000;

export function riskReasons(input: RiskInput, now: Date): RiskReason[] {
  const reasons: RiskReason[] = [];
  const reference = input.lastActivityAt ?? input.enrolledAt;
  const idle = Math.floor((now.getTime() - reference.getTime()) / DAY_MS);
  if (idle >= INACTIVE_DAYS) reasons.push({ kind: "inactive", days: idle, since: input.lastActivityAt });
  const recent = input.failedSectionsAt.filter((d) => now.getTime() - d.getTime() <= FAILED_WINDOW_DAYS * DAY_MS).length;
  if (recent >= FAILED_SECTIONS_THRESHOLD) reasons.push({ kind: "failed_checks", sections: recent });
  return reasons;
}

export function riskText(r: RiskReason): string {
  if (r.kind === "inactive")
    return r.since ? `No learning activity for ${r.days} days` : `No learning activity since enrolling (${r.days} days)`;
  return `All 3 check tries wrong on ${r.sections} sections in the last ${FAILED_WINDOW_DAYS} days`;
}

// ---------------------------------------------------------------------------
// Calendar invites (.ics, RFC 5545)
// ---------------------------------------------------------------------------

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** Fold lines longer than 75 octets (RFC 5545 §3.1). */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest, "utf8") > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut), "utf8") > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

export type IcsEvent = {
  uid: string;
  sequence: number;
  start: Date;
  end: Date;
  title: string;
  description: string;
  url: string;
  cancelled: boolean;
  stamp: Date;
};

export function buildIcs(e: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LMS//Live sessions//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${e.cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `SEQUENCE:${e.sequence}`,
    `DTSTAMP:${icsDate(e.stamp)}`,
    `DTSTART:${icsDate(e.start)}`,
    `DTEND:${icsDate(e.end)}`,
    `SUMMARY:${icsText(e.title)}`,
    `DESCRIPTION:${icsText(e.description)}`,
    `URL:${e.url}`,
    `LOCATION:${icsText(e.url)}`,
    `STATUS:${e.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
