/**
 * QCTO Form 5, section 4 (hybrid/blended delivery): the items the readiness
 * dashboard tracks (design.md §14, 2026-11-09; docs/lms/compliance/form5-mapping.md).
 * Pure data and rules; lib/server/readiness.ts computes live status.
 */

export type Form5Section = "4.1" | "4.2" | "4.3" | "4.4";

export const SECTION_TITLES: Record<Form5Section, string> = {
  "4.1": "Implementation, management and administration of online delivery",
  "4.2": "Delivery of the Knowledge Module",
  "4.3": "Delivery of the Practical Module",
  "4.4": "Delivery of the Workplace Module",
};

/** Items answered by a document only GRIT Hub holds (reference recorded on the dashboard). */
export const MANUAL_ITEMS: Record<string, string> = {
  "4.1.1": "Operating system licence",
  "4.1.3": "LMS ownership and hosting subscriptions, with the capacity statement",
  "4.1.4": "Connectivity statement (how learners and staff get internet access and how it is guaranteed)",
  "4.1.5": "Internet service provider contract",
  "4.2.9": "Conferencing licence (Zoom subscription)",
};

export const FORM5_ITEMS: { code: string; section: Form5Section; title: string }[] = [
  { code: "4.1.1", section: "4.1", title: "Valid licence for the operating system used by the SDP" },
  { code: "4.1.2", section: "4.1", title: "Name of the LMS used by the SDP" },
  { code: "4.1.3", section: "4.1", title: "Evidence of a valid LMS licence and the number of learners it accommodates" },
  { code: "4.1.4", section: "4.1", title: "Are computers/laptops connected to the internet? Method of connectivity and how it is guaranteed" },
  { code: "4.1.5", section: "4.1", title: "Internet service provider; valid contract/agreement" },
  { code: "4.1.6", section: "4.1", title: "How LMS data is stored, backed up and protected; where; and backup frequency" },
  { code: "4.2.1", section: "4.2", title: "How the LMS delivers the Knowledge Module activities" },
  { code: "4.2.2", section: "4.2", title: "Are all knowledge components of the learning material loaded?" },
  { code: "4.2.3", section: "4.2", title: "Are formative assessment activities loaded?" },
  { code: "4.2.4", section: "4.2", title: "How formative assessments are conducted" },
  { code: "4.2.5", section: "4.2", title: "How moderation of formative assessments is conducted" },
  { code: "4.2.6", section: "4.2", title: "How the facilitator communicates with learners" },
  { code: "4.2.7", section: "4.2", title: "Evidence of a digital library" },
  { code: "4.2.8", section: "4.2", title: "Webinar/conferencing platform and features used" },
  { code: "4.2.9", section: "4.2", title: "Valid licence of the conferencing platform" },
  { code: "4.2.10", section: "4.2", title: "Evidence of facilitator-posted notes or video recordings" },
  { code: "4.2.11", section: "4.2", title: "How learners are academically supported through the LMS" },
  { code: "4.3.1", section: "4.3", title: "How the LMS delivers Practical Module activities" },
  { code: "4.3.2", section: "4.3", title: "Is all practical content loaded?" },
  { code: "4.3.3", section: "4.3", title: "Are practical formative assessment activities loaded?" },
  { code: "4.3.4", section: "4.3", title: "How formative assessments of practical components are conducted" },
  { code: "4.3.5", section: "4.3", title: "How moderation of practical components is conducted" },
  { code: "4.4.1", section: "4.4", title: "How the Workplace Module is implemented using the LMS" },
  { code: "4.4.2", section: "4.4", title: "How Workplace Module activities are assessed" },
  { code: "4.4.3", section: "4.4", title: "How Workplace Module activities are moderated" },
];

export type ItemStatus = "ready" | "attention" | "manual" | "na";

export const STATUS_LABEL: Record<ItemStatus, { icon: string; word: string }> = {
  ready: { icon: "✓", word: "Ready" },
  attention: { icon: "!", word: "Needs attention" },
  manual: { icon: "▢", word: "Manual document needed" },
  na: { icon: "–", word: "Not applicable" },
};

/** Freshness rules (design.md §14, 2026-11-09). */
export const BACKUP_MAX_AGE_DAYS = 7;
export const RESTORE_TEST_MAX_AGE_DAYS = 90;
export const DOCUMENT_EXPIRY_WARNING_DAYS = 30;

const DAY = 86_400_000;

export function ageDays(at: Date | null, now: Date): number | null {
  return at ? Math.floor((now.getTime() - at.getTime()) / DAY) : null;
}

/** A manual document's status: missing → manual; expired or expiring within 30 days → attention. */
export function documentStatus(
  doc: { validUntil: string | null } | null,
  now: Date,
): { status: ItemStatus; note: string | null } {
  if (!doc) return { status: "manual", note: null };
  if (!doc.validUntil) return { status: "ready", note: null };
  const until = new Date(`${doc.validUntil}T23:59:59+02:00`);
  const days = Math.floor((until.getTime() - now.getTime()) / DAY);
  if (days < 0) return { status: "attention", note: `Expired ${doc.validUntil}` };
  if (days <= DOCUMENT_EXPIRY_WARNING_DAYS) return { status: "attention", note: `Expires soon (${doc.validUntil})` };
  return { status: "ready", note: null };
}

/** 4.1.6: backup within 7 days and a restore test within 90. */
export function backupItemStatus(lastBackup: Date | null, lastRestoreTest: Date | null, now: Date): { status: ItemStatus; problems: string[] } {
  const problems: string[] = [];
  const b = ageDays(lastBackup, now);
  const r = ageDays(lastRestoreTest, now);
  if (b === null) problems.push("No successful backup yet");
  else if (b > BACKUP_MAX_AGE_DAYS) problems.push(`Last backup ${b} days ago (must be within ${BACKUP_MAX_AGE_DAYS})`);
  if (r === null) problems.push("No restore test logged yet");
  else if (r > RESTORE_TEST_MAX_AGE_DAYS) problems.push(`Last restore test ${r} days ago (must be within ${RESTORE_TEST_MAX_AGE_DAYS})`);
  return { status: problems.length ? "attention" : "ready", problems };
}

export function statusCounts(items: { status: ItemStatus }[]): Record<ItemStatus, number> {
  const c: Record<ItemStatus, number> = { ready: 0, attention: 0, manual: 0, na: 0 };
  for (const i of items) c[i.status]++;
  return c;
}
