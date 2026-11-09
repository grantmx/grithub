"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/access";
import { publishAnnouncement, setAnnouncementPinned } from "@/lib/server/announcements";
import { AccessDeniedError } from "@/lib/server/auth";
import { CommsError } from "@/lib/server/comms";
import { resolveReport } from "@/lib/server/contentReports";
import { createThread, editPost, replyToThread, setThreadPinned } from "@/lib/server/discussions";
import {
  addRecording,
  cancelSession,
  scheduleSession,
  setSessionAttendance,
  updateSession,
} from "@/lib/server/liveSessions";
import { editMessage, sendMessage, staffStartConversation } from "@/lib/server/messages";
import { RateLimitError } from "@/lib/server/ratelimit";
import { getActor, getServerCtx } from "@/lib/server/request";
import { addSectionNote, archiveSectionNote } from "@/lib/server/sectionNotes";
import { reassignTicket, replyToTicket, setTicketStatus } from "@/lib/server/tickets";

/**
 * Staff communication and support actions (design.md §14, 2026-11-08).
 * Every write is authorised and cohort-scoped in lib/server/*, in addition
 * to the proxy. Plain form posts that redirect back with ?done= / ?error=.
 */

const str = (form: FormData, key: string) => String(form.get(key) ?? "");

/** Set ?done= or ?error= on a same-site path, dropping any earlier status. */
function withParam(path: string, key: "done" | "error", value: string) {
  const u = new URL(path, "http://x.invalid");
  u.searchParams.delete("done");
  u.searchParams.delete("error");
  u.searchParams.set(key, value);
  return `${u.pathname}${u.search}${u.hash}`;
}

type Ctx = Awaited<ReturnType<typeof getServerCtx>>;
type Actor = Awaited<ReturnType<typeof getActor>>;

/** Run an action; `fn` may return a "done" code, or `{ to, done }` to go elsewhere. */
async function run(back: string, fn: (ctx: Ctx, actor: Actor) => Promise<string | { to: string; done?: string } | void>) {
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  let to = safeNext(back, "/staff");
  let done: string | undefined;
  try {
    const r = await fn(ctx, actor);
    if (typeof r === "string") done = r;
    else if (r) {
      to = safeNext(r.to, to);
      done = r.done;
    }
  } catch (e) {
    if (e instanceof AccessDeniedError) {
      redirect(
        e.decision.result === "stepup"
          ? `/account/passkeys?required=1&next=${encodeURIComponent(to)}`
          : e.decision.result === "signin"
            ? "/signin"
            : "/forbidden",
      );
    }
    if (e instanceof CommsError) redirect(withParam(to, "error", e.message));
    if (e instanceof RateLimitError) redirect(withParam(to, "error", "Too many tries. Please wait a few minutes."));
    throw e;
  }
  redirect(done ? withParam(to, "done", done) : to);
}

// --- Announcements -------------------------------------------------------------

export async function publishAnnouncementAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    await publishAnnouncement(ctx, actor, {
      cohortId: str(form, "cohortId"),
      title: str(form, "title"),
      body: str(form, "body"),
      pin: str(form, "pin") === "1",
    });
    return "published";
  });
}

export async function pinAnnouncementAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    const pinned = str(form, "pinned") === "1";
    await setAnnouncementPinned(ctx, actor, str(form, "id"), pinned);
    return pinned ? "pinned" : "unpinned";
  });
}

// --- Discussions ----------------------------------------------------------------

export async function createThreadAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    const id = await createThread(ctx, actor, {
      cohortId: str(form, "cohortId"),
      moduleId: str(form, "moduleId"),
      title: str(form, "title"),
      body: str(form, "body"),
    });
    return { to: `/staff/discussions/thread/${id}`, done: "thread_created" };
  });
}

export async function pinThreadAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    const pinned = str(form, "pinned") === "1";
    await setThreadPinned(ctx, actor, str(form, "threadId"), pinned);
    return pinned ? "pinned" : "unpinned";
  });
}

export async function staffReplyAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    const id = await replyToThread(ctx, actor, {
      threadId: str(form, "threadId"),
      body: str(form, "body"),
      parentId: str(form, "parentId") || null,
    });
    return { to: `${str(form, "back").split("#")[0]}#post-${id}`, done: "replied" };
  });
}

export async function staffEditPostAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    await editPost(ctx, actor, str(form, "postId"), str(form, "body"));
    return "edited";
  });
}

// --- Messages --------------------------------------------------------------------

export async function staffSendMessageAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    await sendMessage(ctx, actor, str(form, "conversationId"), str(form, "body"));
    return "sent";
  });
}

export async function staffEditMessageAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    await editMessage(ctx, actor, str(form, "messageId"), str(form, "body"));
    return "edited";
  });
}

export async function staffStartConversationAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    const id = await staffStartConversation(ctx, actor, { enrolmentId: str(form, "enrolmentId"), body: str(form, "body") });
    return { to: `/staff/messages/${id}`, done: "sent" };
  });
}

// --- Tickets ----------------------------------------------------------------------

export async function ticketReplyAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    await replyToTicket(ctx, actor, str(form, "ticketId"), str(form, "body"), "staff");
    return "replied";
  });
}

export async function ticketStatusAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    const status = str(form, "status");
    if (status === "closed" && str(form, "confirm") !== "1") {
      throw new CommsError("invalid", "Tick the box to confirm closing the ticket.");
    }
    await setTicketStatus(ctx, actor, str(form, "ticketId"), status);
    return `status_${status}`;
  });
}

export async function ticketReassignAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    await reassignTicket(ctx, actor, str(form, "ticketId"), str(form, "assigneeId"));
    return "reassigned";
  });
}

// --- Reports ----------------------------------------------------------------------

export async function resolveReportAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    const outcome = str(form, "outcome") === "hide" ? "hide" : "dismiss";
    await resolveReport(ctx, actor, str(form, "reportId"), outcome);
    return outcome === "hide" ? "hidden" : "dismissed";
  });
}

// --- Section notes -----------------------------------------------------------------

export async function addNoteAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    await addSectionNote(ctx, actor, {
      cohortId: str(form, "cohortId"),
      sectionId: str(form, "sectionId"),
      body: str(form, "body"),
      recordingUrl: str(form, "recordingUrl"),
      recordingLabel: str(form, "recordingLabel"),
    });
    return "note_added";
  });
}

export async function archiveNoteAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    await archiveSectionNote(ctx, actor, str(form, "noteId"));
    return "note_removed";
  });
}

// --- Live sessions -------------------------------------------------------------------

const sessionFields = (form: FormData) => ({
  moduleId: str(form, "moduleId") || undefined,
  title: str(form, "title"),
  details: str(form, "details"),
  startsAt: str(form, "startsAt"),
  durationMinutes: str(form, "durationMinutes"),
  joinUrl: str(form, "joinUrl"),
});

export async function scheduleSessionAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    const id = await scheduleSession(ctx, actor, { cohortId: str(form, "cohortId"), ...sessionFields(form) });
    return { to: `/staff/sessions/${id}`, done: "scheduled" };
  });
}

export async function updateSessionAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    await updateSession(ctx, actor, str(form, "sessionId"), sessionFields(form));
    return "updated";
  });
}

export async function cancelSessionAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    if (str(form, "confirm") !== "1") throw new CommsError("invalid", "Tick the box to confirm cancelling the session.");
    await cancelSession(ctx, actor, str(form, "sessionId"));
    return "cancelled";
  });
}

export async function recordingAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    await addRecording(ctx, actor, str(form, "sessionId"), str(form, "recordingUrl"));
    return "recording_added";
  });
}

export async function sessionAttendanceAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    await setSessionAttendance(ctx, actor, str(form, "sessionId"), str(form, "enrolmentId"), str(form, "status"));
  });
}
