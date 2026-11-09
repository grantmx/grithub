import { describe, expect, it } from "vitest";
import {
  EDIT_WINDOW_MS,
  buildIcs,
  canEditOwn,
  checkRecordingLink,
  checkZoomLink,
  cleanText,
  riskReasons,
  riskText,
} from "@/lib/comms";
import { addWorkingHours, dueLabel, saPublicHolidays } from "@/lib/workingTime";

const sast = (s: string) => new Date(`${s}+02:00`);

describe("working time (ticket targets)", () => {
  it("knows the fixed and Easter public holidays, with Sunday → Monday", () => {
    const h2026 = saPublicHolidays(2026);
    expect(h2026.has("2026-04-03")).toBe(true); // Good Friday
    expect(h2026.has("2026-04-06")).toBe(true); // Family Day
    expect(h2026.has("2026-06-16")).toBe(true);
    expect(h2026.has("2026-12-16")).toBe(true);
    // 9 August 2026 is a Sunday, so Monday 10 August is a holiday too.
    expect(h2026.has("2026-08-10")).toBe(true);
    expect(saPublicHolidays(2027).has("2027-03-26")).toBe(true); // Good Friday 2027
  });

  it("1 working day from Friday 16:00 is Monday 16:00 (design-gate example)", () => {
    const due = addWorkingHours(sast("2026-11-13T16:00:00"), 9);
    expect(due.toISOString()).toBe(sast("2026-11-16T16:00:00").toISOString());
  });

  it("starts the clock at the next opening outside working hours", () => {
    expect(addWorkingHours(sast("2026-11-10T20:30:00"), 9).toISOString()).toBe(sast("2026-11-11T17:00:00").toISOString());
    expect(addWorkingHours(sast("2026-11-14T10:00:00"), 1).toISOString()).toBe(sast("2026-11-16T09:00:00").toISOString());
  });

  it("skips public holidays (Day of Reconciliation, Christmas)", () => {
    // Tue 15 Dec 2026 12:00 + 9 h: 5 h on the 15th, 16th is a holiday, 4 h on the 17th.
    expect(addWorkingHours(sast("2026-12-15T12:00:00"), 9).toISOString()).toBe(sast("2026-12-17T12:00:00").toISOString());
    // Thu 24 Dec 2026 16:00 + 9 h: 25th and 26th (Fri, Sat) off, Sunday off → Mon 28th 16:00.
    expect(addWorkingHours(sast("2026-12-24T16:00:00"), 9).toISOString()).toBe(sast("2026-12-28T16:00:00").toISOString());
  });

  it("5 working days is 45 working hours", () => {
    expect(addWorkingHours(sast("2026-11-09T08:00:00"), 45).toISOString()).toBe(sast("2026-11-13T17:00:00").toISOString());
  });

  it("labels due and overdue times plainly", () => {
    const now = sast("2026-11-10T10:00:00");
    expect(dueLabel(sast("2026-11-10T13:00:00"), now)).toEqual({ overdue: false, text: "Due in 3 h" });
    expect(dueLabel(sast("2026-11-09T09:00:00"), now)).toEqual({ overdue: true, text: "Overdue 1 day" });
    expect(dueLabel(sast("2026-11-10T09:30:00"), now)).toEqual({ overdue: true, text: "Overdue 30 min" });
  });
});

describe("links", () => {
  it("accepts only https Zoom links for joining", () => {
    expect(checkZoomLink("https://us02web.zoom.us/j/123?pwd=abc").ok).toBe(true);
    expect(checkZoomLink("https://zoom.us/j/1").ok).toBe(true);
    expect(checkZoomLink("http://zoom.us/j/1").ok).toBe(false);
    expect(checkZoomLink("https://teams.microsoft.com/l/meetup-join/x").ok).toBe(false);
    expect(checkZoomLink("https://zoom.us.evil.example/j/1").ok).toBe(false);
    expect(checkZoomLink("https://user:pw@zoom.us/j/1").ok).toBe(false);
    expect(checkZoomLink("not a link").ok).toBe(false);
  });

  it("accepts recordings from Zoom cloud or the evidence allow-list", () => {
    expect(checkRecordingLink("https://us02web.zoom.us/rec/share/abc").ok).toBe(true);
    expect(checkRecordingLink("https://youtu.be/abc").ok).toBe(true);
    expect(checkRecordingLink("https://drive.google.com/file/d/x").ok).toBe(true);
    const bad = checkRecordingLink("https://example.com/video.mp4");
    expect(bad.ok).toBe(false);
  });
});

describe("text and edits", () => {
  it("cleans and length-checks text", () => {
    expect(cleanText("  hi\r\nthere\u0007 ")).toEqual({ ok: true, value: "hi\nthere" });
    expect(cleanText("   ").ok).toBe(false);
    expect(cleanText("x".repeat(5001)).ok).toBe(false);
  });

  it("allows edits for 15 minutes only", () => {
    const t = new Date("2026-11-10T10:00:00Z");
    expect(canEditOwn(t, new Date(t.getTime() + EDIT_WINDOW_MS))).toBe(true);
    expect(canEditOwn(t, new Date(t.getTime() + EDIT_WINDOW_MS + 1))).toBe(false);
  });
});

describe("at-risk rules", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

  it("flags 7 days without learning activity", () => {
    expect(riskReasons({ enrolledAt: daysAgo(60), lastActivityAt: daysAgo(6), failedSectionsAt: [] }, now)).toEqual([]);
    const r = riskReasons({ enrolledAt: daysAgo(60), lastActivityAt: daysAgo(9), failedSectionsAt: [] }, now);
    expect(r).toEqual([{ kind: "inactive", days: 9, since: daysAgo(9) }]);
    expect(riskText(r[0]!)).toBe("No learning activity for 9 days");
  });

  it("counts from enrolment when the learner has never started", () => {
    expect(riskReasons({ enrolledAt: daysAgo(3), lastActivityAt: null, failedSectionsAt: [] }, now)).toEqual([]);
    const r = riskReasons({ enrolledAt: daysAgo(10), lastActivityAt: null, failedSectionsAt: [] }, now);
    expect(riskText(r[0]!)).toBe("No learning activity since enrolling (10 days)");
  });

  it("flags 2 all-wrong sections within 14 days, not 1, and not older ones", () => {
    const base = { enrolledAt: daysAgo(60), lastActivityAt: daysAgo(1) };
    expect(riskReasons({ ...base, failedSectionsAt: [daysAgo(2)] }, now)).toEqual([]);
    expect(riskReasons({ ...base, failedSectionsAt: [daysAgo(2), daysAgo(20)] }, now)).toEqual([]);
    expect(riskReasons({ ...base, failedSectionsAt: [daysAgo(2), daysAgo(5)] }, now)).toEqual([{ kind: "failed_checks", sections: 2 }]);
  });
});

describe("calendar invites", () => {
  const event = {
    uid: "s1@lms.test.invalid",
    sequence: 2,
    start: new Date("2026-11-10T16:00:00Z"),
    end: new Date("2026-11-10T17:00:00Z"),
    title: "Subnetting Q&A; part 1, revision",
    description: "Bring questions.\nJoin on Zoom: https://zoom.us/j/1",
    url: "https://zoom.us/j/1",
    cancelled: false,
    stamp: new Date("2026-11-08T10:00:00Z"),
  };

  it("builds a valid VEVENT with escaped text, CRLF and the sequence", () => {
    const ics = buildIcs(event);
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("DTSTART:20261110T160000Z\r\n");
    expect(ics).toContain("SEQUENCE:2\r\n");
    expect(ics).toContain("SUMMARY:Subnetting Q&A\\; part 1\\, revision\r\n");
    expect(ics).toContain("STATUS:CONFIRMED");
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  });

  it("marks cancellations", () => {
    const ics = buildIcs({ ...event, cancelled: true });
    expect(ics).toContain("METHOD:CANCEL");
    expect(ics).toContain("STATUS:CANCELLED");
  });
});
