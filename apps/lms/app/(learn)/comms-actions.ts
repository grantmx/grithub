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
import { InputError, checkId, id, optionalId, text } from "@/lib/server/input";
import { getActor, getServerCtx } from "@/lib/server/request";
import { raiseTicket, reopenTicket, replyToTicket } from "@/lib/server/tickets";

/**
 * Learner communication actions (design.md §14, 2026-11-08): plain form
 * posts that redirect back with ?done= or ?error=. Every write is
 * authorised, scoped and rate-limited in lib/server/*.
 */

type Ctx = Awaited<ReturnType<typeof getServerCtx>>;
type Actor = NonNullable<Awaited<ReturnType<typeof getActor>>>;


function withParam(path: string, key: string, value: string) {
  const [base, hash] = path.split("#");
  const sep = base!.includes("?") ? "&" : "?";
  return `${base}${sep}${key}=${encodeURIComponent(value)}${hash ? `#${hash}` : ""}`;
}

function message(e: unknown): string | null {
  if (e instanceof CommsError || e instanceof InputError) return e.message;
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
  const threadId = id(form, "threadId");
  await run(text(form, "back"), `/learn/discuss/thread/${threadId}`, async (ctx, actor) => {
    const postId = await replyToThread(ctx, actor, { threadId, body: text(form, "body"), parentId: optionalId(form, "parentId") ?? null });
    return { to: `${safeNext(text(form, "back"), `/learn/discuss/thread/${threadId}`).split("?")[0]}#post-${postId}`, done: "posted" };
  });
}

export async function editPostAction(form: FormData) {
  await run(text(form, "back"), "/messages", async (ctx, actor) => {
    await editPost(ctx, actor, id(form, "postId"), text(form, "body"));
    return { done: "edited" };
  });
}

// --- Reports --------------------------------------------------------------------

export async function reportAction(form: FormData) {
  await run(text(form, "back"), "/messages", async (ctx, actor) => {
    await reportContent(ctx, actor, {
      targetType: text(form, "targetType"),
      targetId: id(form, "targetId"),
      reason: text(form, "reason"),
      note: text(form, "note"),
    });
    return { done: "reported" };
  });
}

// --- Direct messages --------------------------------------------------------------

export async function startConversationAction(form: FormData) {
  await run(text(form, "back"), "/messages/new", async (ctx, actor) => {
    const [cohortId = "", staffId = ""] = text(form, "recipient").split(":");
    if (!cohortId || !staffId) throw new CommsError("invalid", "Choose who to send your message to.");
    const conversationId = await startConversation(ctx, actor, { cohortId: checkId(cohortId), staffId: checkId(staffId), body: text(form, "body") });
    return { to: `/messages/c/${conversationId}`, done: "sent" };
  });
}

export async function sendMessageAction(form: FormData) {
  const conversationId = id(form, "conversationId");
  await run(text(form, "back"), `/messages/c/${conversationId}`, async (ctx, actor) => {
    await sendMessage(ctx, actor, conversationId, text(form, "body"));
    return { done: "sent" };
  });
}

export async function editMessageAction(form: FormData) {
  await run(text(form, "back"), "/messages", async (ctx, actor) => {
    await editMessage(ctx, actor, id(form, "messageId"), text(form, "body"));
    return { done: "edited" };
  });
}

// --- Support tickets ----------------------------------------------------------------

export async function raiseTicketAction(form: FormData) {
  await run(text(form, "back"), "/messages/help/new", async (ctx, actor) => {
    const ticketId = await raiseTicket(ctx, actor, {
      category: text(form, "category"),
      cohortId: optionalId(form, "cohortId"),
      subject: text(form, "subject"),
      body: text(form, "body"),
    });
    return { to: `/messages/help/${ticketId}`, done: "raised" };
  });
}

export async function ticketReplyAction(form: FormData) {
  const ticketId = id(form, "ticketId");
  await run(text(form, "back"), `/messages/help/${ticketId}`, async (ctx, actor) => {
    await replyToTicket(ctx, actor, ticketId, text(form, "body"), "learner");
    return { done: "replied" };
  });
}

export async function reopenTicketAction(form: FormData) {
  const ticketId = id(form, "ticketId");
  await run(text(form, "back"), `/messages/help/${ticketId}`, async (ctx, actor) => {
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
      announcements: text(form, "announcements"),
      discussions: text(form, "discussions"),
      messages: text(form, "messages"),
      tickets: text(form, "tickets"),
    });
    return { done: "saved" };
  });
}
