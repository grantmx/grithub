import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { emailPreferences, notifications, users } from "db";
import type { AccessContext } from "@/lib/access";
import { safeNext } from "@/lib/access";
import type { ServerCtx } from "./context";
import { claimJobRun } from "./comms";
import { type EmailMessage, digestEmail, notificationEmail, sendEmail } from "./email";

/**
 * Notifications (design.md §14, 2026-11-08): every event adds a row to the
 * recipient's in-app list (the bell). Email follows the recipient's
 * preferences for the optional types (instant, weekly digest or off);
 * essential emails such as live-session changes are always sent.
 */

export type NotificationKind = "announcement" | "discussion" | "message" | "ticket" | "session";
export type Frequency = "instant" | "digest" | "off";
export type EmailPrefs = { announcements: Frequency; discussions: Frequency; messages: Frequency; tickets: Frequency };

export const FREQUENCIES: readonly Frequency[] = ["instant", "digest", "off"];
export const DEFAULT_EMAIL_PREFS: EmailPrefs = {
  announcements: "instant",
  discussions: "instant",
  messages: "instant",
  tickets: "instant",
};

const PREF_FOR: Record<Exclude<NotificationKind, "session">, keyof EmailPrefs> = {
  announcement: "announcements",
  discussion: "discussions",
  message: "messages",
  ticket: "tickets",
};

export type NotifyInput = {
  kind: NotificationKind;
  /** Shown in the bell and in digests. No message text, no other learners' names. */
  title: string;
  /** Relative link to the item. */
  link: string;
  email: { subject: string; lines: string[]; cta?: string; attachments?: EmailMessage["attachments"] };
  /** Always email, ignoring preferences (session changes and similar). */
  essential?: boolean;
  /** Bell only, never email (e.g. a recording was added). */
  noEmail?: boolean;
};

type Ctx = Pick<ServerCtx, "db" | "config" | "now">;

/** Add a notification for each recipient and email them per their preferences. */
export async function notify(ctx: Ctx, recipientIds: readonly string[], input: NotifyInput): Promise<void> {
  const ids = [...new Set(recipientIds)];
  if (ids.length === 0) return;
  const link = safeNext(input.link, "/");
  const people = await ctx.db
    .select({
      id: users.id,
      email: users.email,
      status: users.status,
      announcements: emailPreferences.announcements,
      discussions: emailPreferences.discussions,
      messages: emailPreferences.messages,
      tickets: emailPreferences.tickets,
    })
    .from(users)
    .leftJoin(emailPreferences, eq(emailPreferences.userId, users.id))
    .where(inArray(users.id, ids));

  for (const p of people) {
    if (p.status === "suspended") continue;
    const freq: Frequency = input.noEmail
      ? "off"
      : input.essential || input.kind === "session"
        ? "instant"
        : ((p[PREF_FOR[input.kind]] as Frequency | null) ?? "instant");
    const [row] = await ctx.db
      .insert(notifications)
      .values({ userId: p.id, kind: input.kind, title: input.title.slice(0, 300), link, digestPending: freq === "digest" })
      .returning({ id: notifications.id });
    if (freq !== "instant" || p.status !== "active") continue;
    try {
      await sendEmail(
        notificationEmail(
          p.email,
          input.email.subject,
          input.email.lines,
          `${ctx.config.appUrl}${link}`,
          input.email.cta,
          input.email.attachments,
        ),
      );
      await ctx.db.update(notifications).set({ emailedAt: ctx.now() }).where(eq(notifications.id, row!.id));
    } catch (e) {
      // A failed email never blocks the post itself. Never log the address.
      console.error(`[notify] email failed for a ${input.kind} notification: ${(e as Error).message}`);
    }
  }
}

export async function listNotifications(ctx: Pick<ServerCtx, "db">, actor: AccessContext, limit = 50) {
  return ctx.db
    .select({
      id: notifications.id,
      kind: notifications.kind,
      title: notifications.title,
      link: notifications.link,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, actor.userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function unreadNotificationCount(ctx: Pick<ServerCtx, "db">, userId: string): Promise<number> {
  const [row] = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

/** Mark one notification read and return where it points (only the owner's own rows). */
export async function openNotification(ctx: Pick<ServerCtx, "db" | "now">, actor: AccessContext, id: string): Promise<string> {
  const [row] = await ctx.db
    .update(notifications)
    .set({ readAt: sql`coalesce(${notifications.readAt}, ${ctx.now()})` })
    .where(and(eq(notifications.id, id), eq(notifications.userId, actor.userId)))
    .returning({ link: notifications.link });
  return safeNext(row?.link, "/notifications");
}

export async function markAllRead(ctx: Pick<ServerCtx, "db" | "now">, actor: AccessContext): Promise<void> {
  await ctx.db
    .update(notifications)
    .set({ readAt: ctx.now() })
    .where(and(eq(notifications.userId, actor.userId), isNull(notifications.readAt)));
}

/** Mark notifications pointing at a link as read (e.g. on opening the item itself). */
export async function markReadByLink(ctx: Pick<ServerCtx, "db" | "now">, userId: string, link: string): Promise<void> {
  await ctx.db
    .update(notifications)
    .set({ readAt: ctx.now() })
    .where(and(eq(notifications.userId, userId), eq(notifications.link, link), isNull(notifications.readAt)));
}

export async function getEmailPrefs(ctx: Pick<ServerCtx, "db">, userId: string): Promise<EmailPrefs> {
  const [row] = await ctx.db
    .select({
      announcements: emailPreferences.announcements,
      discussions: emailPreferences.discussions,
      messages: emailPreferences.messages,
      tickets: emailPreferences.tickets,
    })
    .from(emailPreferences)
    .where(eq(emailPreferences.userId, userId));
  return row ?? DEFAULT_EMAIL_PREFS;
}

export async function saveEmailPrefs(
  ctx: Pick<ServerCtx, "db">,
  actor: AccessContext,
  input: Record<keyof EmailPrefs, string>,
): Promise<EmailPrefs> {
  const pick = (v: string): Frequency => (FREQUENCIES.includes(v as Frequency) ? (v as Frequency) : "instant");
  const prefs: EmailPrefs = {
    announcements: pick(input.announcements),
    discussions: pick(input.discussions),
    messages: pick(input.messages),
    tickets: pick(input.tickets),
  };
  await ctx.db
    .insert(emailPreferences)
    .values({ userId: actor.userId, ...prefs })
    .onConflictDoUpdate({ target: emailPreferences.userId, set: prefs });
  return prefs;
}

/** ISO week key, e.g. "2026-W46" (one digest per week). */
export function isoWeekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Weekly digest (Monday 07:00 SAST, Vercel cron): one email per person with
 * every notification held for the digest since the last one.
 */
export async function runWeeklyDigest(ctx: Ctx): Promise<{ ran: boolean; emails: number }> {
  if (!(await claimJobRun(ctx, "weekly-digest", isoWeekKey(ctx.now())))) return { ran: false, emails: 0 };
  const rows = await ctx.db
    .select({ id: notifications.id, userId: notifications.userId, title: notifications.title, email: users.email, status: users.status })
    .from(notifications)
    .innerJoin(users, eq(users.id, notifications.userId))
    .where(eq(notifications.digestPending, true))
    .orderBy(desc(notifications.createdAt));
  const byUser = new Map<string, { email: string; active: boolean; ids: string[]; titles: string[] }>();
  for (const r of rows) {
    const entry = byUser.get(r.userId) ?? { email: r.email, active: r.status === "active", ids: [], titles: [] };
    entry.ids.push(r.id);
    entry.titles.push(r.title);
    byUser.set(r.userId, entry);
  }
  let emails = 0;
  for (const entry of byUser.values()) {
    if (entry.active) {
      try {
        await sendEmail(digestEmail(entry.email, entry.titles, `${ctx.config.appUrl}/notifications`));
        emails++;
      } catch (e) {
        console.error(`[digest] email failed: ${(e as Error).message}`);
        continue;
      }
    }
    await ctx.db
      .update(notifications)
      .set({ digestPending: false, emailedAt: entry.active ? ctx.now() : null })
      .where(inArray(notifications.id, entry.ids));
  }
  return { ran: true, emails };
}
