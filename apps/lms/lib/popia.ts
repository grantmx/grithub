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
/**
 * The responsible party named in learner-facing legal text. One place, so the
 * later tenancy work can read it from tenant settings instead.
 */
export const RESPONSIBLE_PARTY = {
  shortName: "GRIT Hub",
  fullName: "GRIT Hub (Garden Route Innovation and Technology Hub)",
  informationOfficer: "[to be confirmed before launch]",
} as const;
const RP = RESPONSIBLE_PARTY;

export type NoticeSection = { heading: string; paragraphs: string[] };
export type Notice = {
  version: string;
  title: string;
  sections: NoticeSection[];
};

export const CURRENT_NOTICE: Notice = {
  version: "2026-11-draft-2",
  title: "How we use your personal information",
  sections: [
    {
      heading: "Who we are",
      paragraphs: [
        `${RP.fullName} is the responsible party for the personal information in this learning platform.`,
        `Information Officer contact: ${RP.informationOfficer}.`,
      ],
    },
    {
      heading: "What we collect",
      paragraphs: [
        "Your name and email address, the cohort you are enrolled in, your learning progress, your answers to checks and assessments, the work you submit, assessor and moderator decisions, attendance on assessment days, and records of when you sign in.",
        "If you are a learner, the details the QCTO asks for: your title and full name as on your ID, your ID or passport number, date of birth, gender, nationality, citizenship and immigration status, home language, home and postal address, phone numbers, province and area, employment status, population group (race) and disability status. Population group and disability are special personal information; we ask for them only because the QCTO requires them, and they don't affect your training or results. Your ID number, date of birth, address, phone numbers, population group and disability are stored encrypted.",
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
      heading: "Who we share it with",
      paragraphs: [
        "The Quality Council for Trades and Occupations (QCTO). The QCTO requires training providers to send learner details so learners can be enrolled for the external assessment (EISA) and certified. We email your learner details to the QCTO in the spreadsheet format it prescribes. The QCTO then uses them as a responsible party in its own right.",
        "We ask for your separate agreement to this below.",
      ],
    },
    {
      heading: "Who processes it for us (operators)",
      paragraphs: [
        "Our hosting and database provider stores the platform data.",
        "Resend sends our emails (invitations, sign-in links, and the learner details we email to the QCTO) and processes them outside South Africa.",
        "Airtable is used for management reporting. A copy of your enrolment, QCTO learner details (including your ID number, population group and disability status), attendance and result information is sent to Airtable, which stores it outside South Africa.",
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

/**
 * Separate consent to share learner details with the QCTO (LEISA columns AH
 * "POPI Act Agree" and AI "POPI Act Date"). Learners only. Stored in
 * consent_records with kind 'qcto_sharing'. DRAFT wording: Information Officer
 * review needed. Changing ANY wording requires a new `version`; learners whose
 * latest agreement is to another version go back through setup.
 */
export type SharingConsent = {
  version: string;
  statement: string;
  whyRequired: string;
};

export const QCTO_SHARING_CONSENT: SharingConsent = {
  version: "2026-11-draft-1",
  statement: `I agree that ${RP.shortName} may send my learner details, including my ID or passport number, population group (race) and disability status, to the Quality Council for Trades and Occupations (QCTO) by email so that I can be enrolled, assessed and certified, and may keep a copy in Airtable, which stores it outside South Africa.`,
  whyRequired: `The QCTO needs these details to enrol you for the external assessment and to certify you, so we can't finish setting up your account without this agreement. If you have questions or concerns, contact the Information Officer: ${RP.informationOfficer}.`,
};

export function sharingConsentSha256(
  consent: SharingConsent = QCTO_SHARING_CONSENT,
): string {
  return createHash("sha256").update(JSON.stringify(consent)).digest("hex");
}
