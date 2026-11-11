import { STANDARD_EMAIL_HTML } from "./emailTemplate.generated";
import { type EmailConfig, readEmailConfig } from "./env";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** The single link in the email (lets dev/test transports show it). */
  link: string;
  /** Optional files, e.g. a calendar invite (.ics). */
  attachments?: { filename: string; contentType: string; content: string }[];
};

/** Product name used in notification emails (one place; tenancy readiness). */
export const APP_NAME = "GRIT Hub Learning";

/** Messages captured by the "memory" transport (tests only). */
export const memoryOutbox: EmailMessage[] = [];

/**
 * Send one email. The console transport prints only the subject and link,
 * never the recipient address. Errors never include the address either.
 */
export async function sendEmail(
  message: EmailMessage,
  config: EmailConfig = readEmailConfig(),
): Promise<void> {
  switch (config.transport) {
    case "memory":
      memoryOutbox.push(message);
      return;
    case "console":
      console.info(`[email:dev] ${message.subject} -> ${message.link}`);
      return;
    case "resend": {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: config.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
          ...(message.attachments?.length
            ? {
                attachments: message.attachments.map((a) => ({
                  filename: a.filename,
                  content: Buffer.from(a.content, "utf8").toString("base64"),
                  content_type: a.contentType,
                })),
              }
            : {}),
        }),
      });
      if (!res.ok) {
        throw new Error(
          `Email provider rejected the message (HTTP ${res.status}).`,
        );
      }
      return;
    }
  }
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Brand values for the standard email footer and header (one place, for
 * tenancy). Mirrors apps/web/components/emails/StandardEmail.js.
 */
export const EMAIL_BRAND = {
  orgName: "The Garden Route Innovation & Technology Hub",
  orgShortName: "GRIT Hub",
  address: "York St. Blvd. Shopping Center, Suite #2, George, South Africa 6529",
  siteUrl: "https://grithub.org.za",
  logoUrl: "https://grithub.org.za/assets/grithub-logo-horz.png",
  facebookUrl: "https://www.facebook.com/grithub.za",
  twitterUrl: "https://twitter.com/grithub_za",
  instagramUrl: "https://www.instagram.com/grithub_za/",
  footerLinks: [
    { label: "Training", href: "https://grithub.org.za/programs" },
    { label: "Consulting", href: "https://grithub.org.za/consulting" },
    { label: "Incubation", href: "https://grithub.org.za/incubation" },
    { label: "CoWork", href: "https://grithub.org.za/cowork" },
  ],
} as const;

/**
 * Fill the standard GRIT Hub email (emails/standard.mjml, compiled) and a
 * matching plain-text version. Every value is HTML-escaped here.
 */
export function renderEmail(opts: {
  subject: string;
  heading: string;
  lines: string[];
  link: string;
  cta: string;
  now?: Date;
}): { text: string; html: string } {
  const { subject, heading, lines, link, cta } = opts;
  const year = String((opts.now ?? new Date()).getFullYear());
  const text = [
    heading,
    "",
    ...lines,
    "",
    `${cta}: ${link}`,
    "",
    "If you did not expect this email, you can ignore it.",
    "",
    `\u00a9${year} ${EMAIL_BRAND.orgName}`,
  ].join("\n");
  const values: Record<string, string> = {
    subject: escapeHtml(subject),
    heading: escapeHtml(heading),
    body: lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("\n"),
    cta: escapeHtml(cta),
    ctaHref: escapeHtml(link),
    year,
    orgName: escapeHtml(EMAIL_BRAND.orgName),
    orgShortName: escapeHtml(EMAIL_BRAND.orgShortName),
    address: escapeHtml(EMAIL_BRAND.address),
    siteUrl: escapeHtml(EMAIL_BRAND.siteUrl),
    logoUrl: escapeHtml(EMAIL_BRAND.logoUrl),
    facebookUrl: escapeHtml(EMAIL_BRAND.facebookUrl),
    twitterUrl: escapeHtml(EMAIL_BRAND.twitterUrl),
    instagramUrl: escapeHtml(EMAIL_BRAND.instagramUrl),
    footerLinks: EMAIL_BRAND.footerLinks
      .map(
        (f) =>
          `<a href="${escapeHtml(f.href)}" style="color:#aaaaaa">${escapeHtml(f.label)}</a>`,
      )
      .join(" &nbsp;|&nbsp; "),
  };
  // Single pass, so a value containing "{{...}}" is never substituted again.
  const html = STANDARD_EMAIL_HTML.replace(/\{\{(\w+)\}\}/g, (m, key: string) =>
    key in values ? values[key]! : m,
  );
  return { text, html };
}

/** Build a complete message in the standard GRIT Hub email template. */
export function templatedEmail(opts: {
  to: string;
  subject: string;
  heading: string;
  lines: string[];
  link: string;
  cta: string;
  attachments?: EmailMessage["attachments"];
}): EmailMessage {
  const { to, subject, link, attachments } = opts;
  return {
    to,
    subject,
    link,
    ...renderEmail(opts),
    ...(attachments ? { attachments } : {}),
  };
}

// TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
export function invitationEmail(
  to: string,
  name: string,
  link: string,
): EmailMessage {
  return templatedEmail({
    to,
    subject: `Your ${APP_NAME} invitation`,
    heading: "You're invited",
    lines: [
      `Hi ${name},`,
      `You have been invited to ${APP_NAME}. Use the button below to set up your account. The link works once and expires in 72 hours.`,
    ],
    link,
    cta: "Set up your account",
  });
}

export function magicLinkEmail(to: string, link: string): EmailMessage {
  return templatedEmail({
    to,
    subject: `Your ${APP_NAME} sign-in link`,
    heading: `Sign in to ${APP_NAME}`,
    lines: [
      `Use the button below to sign in to ${APP_NAME}. The link works once and expires in 15 minutes.`,
    ],
    link,
    cta: "Sign in",
  });
}

export function recoveryEmail(to: string, link: string): EmailMessage {
  return templatedEmail({
    to,
    subject: `Recover your ${APP_NAME} account`,
    heading: "Recover your account",
    lines: [
      "An administrator has started account recovery for you, after checking your identity.",
      "Your old passkeys no longer work. Use the button below to sign in, then add a new passkey. The link works once and expires in 30 minutes.",
    ],
    link,
    cta: "Recover your account",
  });
}

/**
 * Communication notification (announcements, replies, messages, tickets,
 * sessions). Lines never carry message text or other learners' names; the
 * reader follows the link to see the item. The subject is the heading.
 */
export function notificationEmail(
  to: string,
  subject: string,
  lines: string[],
  link: string,
  cta = "Open",
  attachments?: EmailMessage["attachments"],
): EmailMessage {
  return templatedEmail({
    to,
    subject: `${subject} · ${APP_NAME}`,
    heading: subject,
    lines,
    link,
    cta,
    attachments,
  });
}

/** Weekly digest: one line per notification title, newest first. */
export function digestEmail(to: string, titles: string[], link: string): EmailMessage {
  return templatedEmail({
    to,
    subject: `Your weekly summary · ${APP_NAME}`,
    heading: "Your weekly summary",
    lines: [
      `Here is what happened on ${APP_NAME} this week:`,
      ...titles.slice(0, 30).map((t) => `• ${t}`),
      ...(titles.length > 30 ? [`…and ${titles.length - 30} more.`] : []),
    ],
    link,
    cta: "See your notifications",
  });
}
