"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/access";
import { AccessDeniedError } from "@/lib/server/auth";
import { CommsError } from "@/lib/server/comms";
import { reportContent } from "@/lib/server/contentReports";
import { editPost, replyToThread } from "@/lib/server/discussions";
import { editMessage, sendMessage, startConversation } from "@/lib/server/messages";
import { markAllRead, saveEmailPrefs } from "@/lib/server/notify";
import { RateLimitError } from "@/lib/server/ratelimit";
import { getActor, getServerCtx } from "@/lib/server/request";
import { raiseTicket, reopenTicket, replyToTicket } from "@/lib/server/tickets";

/**
 * Learner communication actions (design.md §14, 2026-11-08): plain form
 * posts that redirect back with ?done= or ?error=. Every write is
 * authorised, scoped and rate-limited in lib/server/*.
 */

type Ctx = Awaited<ReturnType<typeof getServerCtx>>;
type Actor = NonNullable<Awaited<ReturnType<typeof getActor>>>;

const str = (form: FormData, key: string) => String(form.get(key) ?? "");

function withParam(path: string, key: string, value: string) {
  const [base, hash] = path.split("#");
  const sep = base!.includes("?") ? "&" : "?";
  return `${base}${sep}${key}=${encodeURIComponent(value)}${hash ? `#${hash}` : ""}`;
}

function message(e: unknown): string | null {
  if (e instanceof CommsError) return e.message;
  if (e instanceof RateLimitError) return "You're sending messages quickly. Try again in a few minutes.";
  return null;
}

/**
 * Run a learner action. `fn` returns where to go on success (or nothing to
 * go back to `back`), plus an optional ?done= code.
 */
async function run(
  back: string,
  fallback: string,
  fn: (ctx: Ctx, actor: Actor) => Promise<{ to?: string; done?: string } | void>,
): Promise<void> {
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  if (!actor) redirect("/signin");
  const from = safeNext(back, fallback);
  let target: string;
  try {
    const r = (await fn(ctx, actor)) ?? {};
    const to = r.to ?? from;
    target = r.done ? withParam(to, "done", r.done) : to;
  } catch (e) {
    if (e instanceof AccessDeniedError) redirect(e.decision.result === "signin" ? "/signin" : "/forbidden");
    const m = message(e);
    if (!m) throw e;
    target = withParam(from, "error", m);
  }
  redirect(target);
}

// --- Discussions --------------------------------------------------------------

export async function replyAction(form: FormData) {
  const threadId = str(form, "threadId");
  await run(str(form, "back"), `/learn/discuss/thread/${threadId}`, async (ctx, actor) => {
    const id = await replyToThread(ctx, actor, { threadId, body: str(form, "body"), parentId: str(form, "parentId") || null });
    return { to: `${safeNext(str(form, "back"), `/learn/discuss/thread/${threadId}`).split("?")[0]}#post-${id}`, done: "posted" };
  });
}

export async function editPostAction(form: FormData) {
  await run(str(form, "back"), "/messages", async (ctx, actor) => {
    await editPost(ctx, actor, str(form, "postId"), str(form, "body"));
    return { done: "edited" };
  });
}

// --- Reports --------------------------------------------------------------------

export async function reportAction(form: FormData) {
  await run(str(form, "back"), "/messages", async (ctx, actor) => {
    await reportContent(ctx, actor, {
      targetType: str(form, "targetType"),
      targetId: str(form, "targetId"),
      reason: str(form, "reason"),
      note: str(form, "note"),
    });
    return { done: "reported" };
  });
}

// --- Direct messages --------------------------------------------------------------

export async function startConversationAction(form: FormData) {
  await run(str(form, "back"), "/messages/new", async (ctx, actor) => {
    const [cohortId = "", staffId = ""] = str(form, "recipient").split(":");
    if (!cohortId || !staffId) throw new CommsError("invalid", "Choose who to send your message to.");
    const id = await startConversation(ctx, actor, { cohortId, staffId, body: str(form, "body") });
    return { to: `/messages/c/${id}`, done: "sent" };
  });
}

export async function sendMessageAction(form: FormData) {
  const conversationId = str(form, "conversationId");
  await run(str(form, "back"), `/messages/c/${conversationId}`, async (ctx, actor) => {
    await sendMessage(ctx, actor, conversationId, str(form, "body"));
    return { done: "sent" };
  });
}

export async function editMessageAction(form: FormData) {
  await run(str(form, "back"), "/messages", async (ctx, actor) => {
    await editMessage(ctx, actor, str(form, "messageId"), str(form, "body"));
    return { done: "edited" };
  });
}

// --- Support tickets ----------------------------------------------------------------

export async function raiseTicketAction(form: FormData) {
  await run(str(form, "back"), "/messages/help/new", async (ctx, actor) => {
    const id = await raiseTicket(ctx, actor, {
      category: str(form, "category"),
      cohortId: str(form, "cohortId") || undefined,
      subject: str(form, "subject"),
      body: str(form, "body"),
    });
    return { to: `/messages/help/${id}`, done: "raised" };
  });
}

export async function ticketReplyAction(form: FormData) {
  const ticketId = str(form, "ticketId");
  await run(str(form, "back"), `/messages/help/${ticketId}`, async (ctx, actor) => {
    await replyToTicket(ctx, actor, ticketId, str(form, "body"), "learner");
    return { done: "replied" };
  });
}

export async function reopenTicketAction(form: FormData) {
  const ticketId = str(form, "ticketId");
  await run(str(form, "back"), `/messages/help/${ticketId}`, async (ctx, actor) => {
    await reopenTicket(ctx, actor, ticketId);
    return { done: "reopened" };
  });
}

// --- Notifications and email preferences ---------------------------------------------

export async function markAllReadAction() {
  await run("/notifications", "/notifications", async (ctx, actor) => {
    await markAllRead(ctx, actor);
    return { done: "read" };
  });
}

export async function emailPrefsAction(form: FormData) {
  await run("/account/notifications", "/account/notifications", async (ctx, actor) => {
    await saveEmailPrefs(ctx, actor, {
      announcements: str(form, "announcements"),
      discussions: str(form, "discussions"),
      messages: str(form, "messages"),
      tickets: str(form, "tickets"),
    });
    return { done: "saved" };
  });
}
