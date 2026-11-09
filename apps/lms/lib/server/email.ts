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

function layout(
  lines: string[],
  link: string,
  cta: string,
): { text: string; html: string } {
  const text = [
    ...lines,
    "",
    `${cta}: ${link}`,
    "",
    "If you did not expect this email, you can ignore it.",
  ].join("\n");
  const html = `<div style="font-family:Inter,Arial,sans-serif;font-size:16px;line-height:1.5;color:#2e303b;max-width:560px">
${lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("\n")}
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#3b6680;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">${escapeHtml(cta)}</a></p>
<p style="color:#5a5d6b;font-size:14px">If you did not expect this email, you can ignore it.</p>
</div>`;
  return { text, html };
}

// TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
export function invitationEmail(
  to: string,
  name: string,
  link: string,
): EmailMessage {
  const body = layout(
    [
      `Hi ${name},`,
      "You have been invited to GRIT Hub Learning. Use the button below to set up your account. The link works once and expires in 72 hours.",
    ],
    link,
    "Set up your account",
  );
  return { to, subject: "Your GRIT Hub Learning invitation", link, ...body };
}

export function magicLinkEmail(to: string, link: string): EmailMessage {
  const body = layout(
    [
      "Use the button below to sign in to GRIT Hub Learning. The link works once and expires in 15 minutes.",
    ],
    link,
    "Sign in",
  );
  return { to, subject: "Your GRIT Hub Learning sign-in link", link, ...body };
}

export function recoveryEmail(to: string, link: string): EmailMessage {
  const body = layout(
    [
      "A GRIT Hub administrator has started account recovery for you, after checking your identity.",
      "Your old passkeys no longer work. Use the button below to sign in, then add a new passkey. The link works once and expires in 30 minutes.",
    ],
    link,
    "Recover your account",
  );
  return {
    to,
    subject: "Recover your GRIT Hub Learning account",
    link,
    ...body,
  };
}

/**
 * Communication notification (announcements, replies, messages, tickets,
 * sessions). Lines never carry message text or other learners' names; the
 * reader follows the link to see the item.
 */
export function notificationEmail(
  to: string,
  subject: string,
  lines: string[],
  link: string,
  cta = "Open",
  attachments?: EmailMessage["attachments"],
): EmailMessage {
  const body = layout(lines, link, cta);
  return { to, subject: `${subject} · ${APP_NAME}`, link, ...body, ...(attachments ? { attachments } : {}) };
}

/** Weekly digest: one line per notification title, newest first. */
export function digestEmail(to: string, titles: string[], link: string): EmailMessage {
  const body = layout(
    [
      `Here is what happened on ${APP_NAME} this week:`,
      ...titles.slice(0, 30).map((t) => `• ${t}`),
      ...(titles.length > 30 ? [`…and ${titles.length - 30} more.`] : []),
    ],
    link,
    "See your notifications",
  );
  return { to, subject: `Your weekly summary · ${APP_NAME}`, link, ...body };
}
