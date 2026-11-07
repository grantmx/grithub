import { createHash } from "node:crypto";

/**
 * Versioned POPIA notice shown during first-time setup.
 *
 * DRAFT: must be reviewed by GRIT Hub's Information Officer / legal adviser
 * before real learners are invited. Changing ANY wording requires a new
 * `version`; users whose accepted version differs are sent back through
 * setup to accept the new notice. Acceptances store the version and the
 * SHA-256 of this exact content (consent_records).
 */
export type NoticeSection = { heading: string; paragraphs: string[] };
export type Notice = {
  version: string;
  title: string;
  sections: NoticeSection[];
};

export const CURRENT_NOTICE: Notice = {
  version: "2026-11-draft-1",
  title: "How we use your personal information",
  sections: [
    {
      heading: "Who we are",
      paragraphs: [
        "GRIT Hub (Garden Route Innovation and Technology Hub) is the responsible party for the personal information in this learning platform.",
        "Information Officer contact: [to be confirmed before launch].",
      ],
    },
    {
      heading: "What we collect",
      paragraphs: [
        "Your name and email address, the cohort you are enrolled in, your learning progress, your answers to checks and assessments, the work you submit, assessor and moderator decisions, attendance on assessment days, and records of when you sign in.",
        "Passkeys: when you sign in with a fingerprint, face or screen lock, that check happens only on your own device. We never receive or store your fingerprint, face or any other biometric data. We only store a public key that cannot be used to recreate it.",
      ],
    },
    {
      heading: "Why we use it",
      paragraphs: [
        "To deliver your training, assess your work, keep your portfolio of evidence, support you, and meet quality-assurance and accreditation requirements (for example, QCTO).",
      ],
    },
    {
      heading: "Who processes it for us (operators)",
      paragraphs: [
        "Our hosting and database provider stores the platform data.",
        "Resend sends our emails (invitations and sign-in links) and may process your email address outside South Africa.",
        "Airtable is used for management reporting. A limited copy of enrolment, attendance and result information is sent to Airtable, which stores it outside South Africa.",
        "When information is processed outside South Africa we rely on the operator's contractual safeguards, as required by section 72 of POPIA.",
      ],
    },
    {
      heading: "How long we keep it",
      paragraphs: [
        "We keep assessment evidence for as long as accreditation rules require, then delete it. [Retention periods to be confirmed before launch.]",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: [
        "You can ask to see or correct your information, object to how it is used, or complain to the Information Regulator of South Africa. Contact the Information Officer above.",
      ],
    },
  ],
};

export function noticeSha256(notice: Notice = CURRENT_NOTICE): string {
  return createHash("sha256").update(JSON.stringify(notice)).digest("hex");
}
