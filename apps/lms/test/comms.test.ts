import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { answerOptions, attemptItems, discussionPosts, enrolments, messageRevisions, notifications, supportTickets, users } from "db";
import { EDIT_WINDOW_MS } from "@/lib/comms";
import {
  getLearnerAnnouncement,
  listLearnerAnnouncements,
  publishAnnouncement,
  setAnnouncementPinned,
} from "@/lib/server/announcements";
import { atRiskCount, cohortRisk } from "@/lib/server/atRisk";
import { AccessDeniedError } from "@/lib/server/auth";
import { CommsError } from "@/lib/server/comms";
import { buildCommsLog, exportCommsLog } from "@/lib/server/commsLog";
import { listReports, openReportCount, reportContent, resolveReport } from "@/lib/server/contentReports";
import { createThread, editPost, getThread, learnerBoard, replyToThread, setThreadPinned } from "@/lib/server/discussions";
import { memoryOutbox } from "@/lib/server/email";
import {
  addRecording,
  cancelSession,
  getSessionForViewer,
  learnerSessions,
  scheduleSession,
  setSessionAttendance,
  toSastLocal,
  updateSession,
} from "@/lib/server/liveSessions";
import {
  editMessage,
  getConversation,
  listLearnerConversations,
  messageRecipients,
  sendMessage,
  staffStartConversation,
  startConversation,
  unreadStaffConversations,
} from "@/lib/server/messages";
import { listNotifications, runWeeklyDigest, saveEmailPrefs, unreadNotificationCount } from "@/lib/server/notify";
import { addSectionNote, notesForSection } from "@/lib/server/sectionNotes";
import { getCheckView, retryCheck, submitCheckAnswer } from "@/lib/server/sectionCheck";
import {
  getTicket,
  listStaffTickets,
  raiseTicket,
  reopenTicket,
  replyToTicket,
  runOverdueTicketEmails,
  setTicketStatus,
} from "@/lib/server/tickets";
import { makeCommsWorld } from "./commsWorld";
import { auditActions, createTestDb, type TestDb } from "./helpers";

let t: TestDb;
let w: Awaited<ReturnType<typeof makeCommsWorld>>;
beforeAll(async () => {
  t = await createTestDb();
  w = await makeCommsWorld(t.db);
});
afterAll(async () => {
  await t?.teardown();
});
beforeEach(() => {
  memoryOutbox.length = 0;
});

const later = (ms: number) => () => new Date(Date.now() + ms);
const sent = (to: string) => memoryOutbox.filter((m) => m.to === to);
const email = (k: "learner1" | "learner2" | "learner3") => `demo.${k}@example.invalid`;

/** The database's own error message (drizzle wraps it in `cause`). */
async function dbError(p: PromiseLike<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    const err = e as Error & { cause?: Error };
    return err.cause?.message ?? err.message;
  }
  return "no error";
}

describe("announcements", () => {
  it("only staff with the cohort in scope can post; learners are notified and emailed", async () => {
    const learner = await w.as(w.ids.learner1);
    await expect(
      publishAnnouncement(learner.ctx, learner.actor, { cohortId: w.cohort.id, title: "x", body: "y", pin: false }),
    ).rejects.toBeInstanceOf(AccessDeniedError);
    const other = await w.as(w.ids.otherFacilitator);
    await expect(
      publishAnnouncement(other.ctx, other.actor, { cohortId: w.cohort.id, title: "x", body: "y", pin: false }),
    ).rejects.toBeInstanceOf(AccessDeniedError);

    const fac = await w.as(w.ids.facilitator);
    const id = await publishAnnouncement(fac.ctx, fac.actor, {
      cohortId: w.cohort.id,
      title: "Venue change for Saturday",
      body: "We meet in **Room 2** (fake).",
      pin: true,
    });
    expect(sent(email("learner1"))).toHaveLength(1);
    expect(sent(email("learner1"))[0]!.link).toContain(`/messages/announcements/${id}`);
    // Emails never carry the announcement body.
    expect(sent(email("learner1"))[0]!.text).not.toContain("Room 2");
    // The other cohort's learner hears nothing.
    expect(memoryOutbox.some((m) => m.link.includes(id) && !m.to.startsWith("demo."))).toBe(false);
    expect(await unreadNotificationCount({ db: t.db }, w.ids.learner1)).toBeGreaterThan(0);
    expect(await auditActions(t.db, w.ids.facilitator)).toContain("comms.announcement.published");
  });

  it("keeps one pin per cohort, pinned first for learners, and marks it read on opening", async () => {
    const fac = await w.as(w.ids.facilitator);
    const second = await publishAnnouncement(fac.ctx, fac.actor, { cohortId: w.cohort.id, title: "Week 3 reading", body: "Read chapter 3.", pin: false });
    const learner = await w.as(w.ids.learner1);
    let list = await listLearnerAnnouncements(learner.ctx, learner.actor);
    expect(list[0]!.title).toBe("Venue change for Saturday");
    expect(list[0]!.pinnedAt).not.toBeNull();
    await setAnnouncementPinned(fac.ctx, fac.actor, second, true);
    list = await listLearnerAnnouncements(learner.ctx, learner.actor);
    expect(list[0]!.id).toBe(second);
    expect(list.filter((a) => a.pinnedAt).length).toBe(1);
    expect(list[0]!.unread).toBe(true);
    await getLearnerAnnouncement(learner.ctx, learner.actor, second);
    list = await listLearnerAnnouncements(learner.ctx, learner.actor);
    expect(list[0]!.unread).toBe(false);
    const outsider = await w.as(w.ids.otherLearner);
    await expect(getLearnerAnnouncement(outsider.ctx, outsider.actor, second)).rejects.toBeInstanceOf(CommsError);
  });

  it("honours email preferences: digest holds emails for the weekly summary; off sends none", async () => {
    const l2 = await w.as(w.ids.learner2);
    const l3 = await w.as(w.ids.learner3);
    await saveEmailPrefs(l2.ctx, l2.actor, { announcements: "digest", discussions: "instant", messages: "instant", tickets: "instant" });
    await saveEmailPrefs(l3.ctx, l3.actor, { announcements: "off", discussions: "instant", messages: "instant", tickets: "instant" });
    const fac = await w.as(w.ids.facilitator);
    await publishAnnouncement(fac.ctx, fac.actor, { cohortId: w.cohort.id, title: "Digest test", body: "Body", pin: false });
    expect(sent(email("learner1"))).toHaveLength(1);
    expect(sent(email("learner2"))).toHaveLength(0);
    expect(sent(email("learner3"))).toHaveLength(0);
    // Both still see it in the bell.
    const bell3 = await listNotifications(l3.ctx, l3.actor);
    expect(bell3[0]!.title).toBe("Announcement: Digest test");

    memoryOutbox.length = 0;
    const r = await runWeeklyDigest(fac.ctx);
    expect(r.ran).toBe(true);
    const digest = sent(email("learner2"));
    expect(digest).toHaveLength(1);
    expect(digest[0]!.text).toContain("Announcement: Digest test");
    expect(sent(email("learner3"))).toHaveLength(0);
    // Same week again: no second digest.
    expect((await runWeeklyDigest(fac.ctx)).ran).toBe(false);
    const pending = await t.db.select().from(notifications).where(eq(notifications.digestPending, true));
    expect(pending).toHaveLength(0);
  });
});

describe("discussions", () => {
  let threadId: string;
  let postId: string;

  it("only facilitators start threads; learners are notified", async () => {
    const learner = await w.as(w.ids.learner1);
    await expect(
      createThread(learner.ctx, learner.actor, { cohortId: w.cohort.id, moduleId: w.km.id, title: "Mine", body: "x" }),
    ).rejects.toBeInstanceOf(AccessDeniedError);
    const fac = await w.as(w.ids.facilitator);
    threadId = await createThread(fac.ctx, fac.actor, {
      cohortId: w.cohort.id,
      moduleId: w.km.id,
      title: "Ask your KM questions here",
      body: "What is still unclear? (fake)",
    });
    expect(sent(email("learner1")).some((m) => m.link.endsWith(`/learn/discuss/thread/${threadId}`))).toBe(true);
    await setThreadPinned(fac.ctx, fac.actor, threadId, true);
    const board = await learnerBoard(learner.ctx, learner.actor, w.km.id);
    expect(board.threads[0]!.id).toBe(threadId);
    expect(board.threads[0]!.pinnedAt).not.toBeNull();
  });

  it("learners reply, nested one level only, and the facilitator is notified", async () => {
    const l1 = await w.as(w.ids.learner1);
    postId = await replyToThread(l1.ctx, l1.actor, { threadId, body: "Is subnetting in the exam? (fake)" });
    expect(sent("demo.facilitator@example.invalid").length).toBeGreaterThan(0);
    const l2 = await w.as(w.ids.learner2);
    const nested = await replyToThread(l2.ctx, l2.actor, { threadId, body: "Same question (fake)", parentId: postId });
    // learner1 is told someone replied to them.
    expect(sent(email("learner1")).some((m) => m.subject.startsWith("New reply"))).toBe(true);
    await expect(replyToThread(l1.ctx, l1.actor, { threadId, body: "too deep", parentId: nested })).rejects.toBeInstanceOf(CommsError);
    // The database enforces the rule too.
    expect(await dbError(t.db.insert(discussionPosts).values({ threadId, parentId: nested, authorId: w.ids.learner1, body: "x" }))).toMatch(
      /one level/,
    );
    const view = await getThread(l1.ctx, l1.actor, threadId);
    expect(view.posts).toHaveLength(1);
    expect(view.posts[0]!.replies).toHaveLength(1);
    expect(view.posts[0]!.canEdit).toBe(true);
    expect(view.posts[0]!.replies[0]!.canReport).toBe(true);
  });

  it("other cohorts can't read the thread", async () => {
    const outsider = await w.as(w.ids.otherLearner);
    await expect(getThread(outsider.ctx, outsider.actor, threadId)).rejects.toBeInstanceOf(CommsError);
    const otherFac = await w.as(w.ids.otherFacilitator);
    await expect(getThread(otherFac.ctx, otherFac.actor, threadId)).rejects.toBeInstanceOf(CommsError);
  });

  it("authors edit within 15 minutes; the earlier text is kept; no edits after", async () => {
    const l1 = await w.as(w.ids.learner1);
    await editPost(l1.ctx, l1.actor, postId, "Is subnetting in the summative? (fake)");
    const revs = await t.db.select().from(messageRevisions).where(eq(messageRevisions.targetId, postId));
    expect(revs.map((r) => r.body)).toEqual(["Is subnetting in the exam? (fake)"]);
    expect(await dbError(t.db.delete(messageRevisions).where(eq(messageRevisions.targetId, postId)))).toMatch(/append-only/);
    expect(await dbError(t.db.delete(discussionPosts).where(eq(discussionPosts.id, postId)))).toMatch(/append-only/);
    const lateCtx = await w.as(w.ids.learner1, later(EDIT_WINDOW_MS + 60_000));
    await expect(editPost(lateCtx.ctx, lateCtx.actor, postId, "changed")).rejects.toMatchObject({ code: "edit_window_closed" });
    const l2 = await w.as(w.ids.learner2);
    await expect(editPost(l2.ctx, l2.actor, postId, "not mine")).rejects.toBeInstanceOf(CommsError);
  });

  it("a reported reply can be hidden by a facilitator; others then see it removed", async () => {
    const l2 = await w.as(w.ids.learner2);
    await expect(
      reportContent(l2.ctx, l2.actor, { targetType: "discussion_post", targetId: (await getThread(l2.ctx, l2.actor, threadId)).posts[0]!.replies[0]!.id, reason: "spam" }),
    ).rejects.toBeInstanceOf(CommsError); // can't report your own reply
    await reportContent(l2.ctx, l2.actor, { targetType: "discussion_post", targetId: postId, reason: "offensive", note: "Rude (fake)" });
    const fac = await w.as(w.ids.facilitator);
    expect(await openReportCount(fac.ctx, fac.actor)).toBe(1);
    const otherFac = await w.as(w.ids.otherFacilitator);
    expect(await listReports(otherFac.ctx, otherFac.actor)).toHaveLength(0);
    const [report] = await listReports(fac.ctx, fac.actor);
    expect(report!.item!.body).toContain("summative");
    await resolveReport(fac.ctx, fac.actor, report!.id, "hide");
    const view = await getThread(l2.ctx, l2.actor, threadId);
    expect(view.posts[0]!.hidden).toBe(true);
    expect(view.posts[0]!.body).toBeNull();
    expect(await auditActions(t.db, w.ids.facilitator)).toContain("comms.report.hidden");
    await expect(resolveReport(fac.ctx, fac.actor, report!.id, "dismiss")).rejects.toBeInstanceOf(CommsError);
  });
});

describe("direct messages", () => {
  let convId: string;

  it("a learner writes to a named facilitator or the assessor of their cohort only", async () => {
    const l1 = await w.as(w.ids.learner1);
    const recipients = await messageRecipients(l1.ctx, l1.actor);
    const ids = recipients.map((r) => r.userId).sort();
    expect(ids).toEqual([w.ids.facilitator, w.ids.facilitator2, w.ids.assessor].sort());
    await expect(
      startConversation(l1.ctx, l1.actor, { cohortId: w.otherCohort.id, staffId: w.ids.otherFacilitator, body: "hi" }),
    ).rejects.toBeInstanceOf(CommsError);
    await expect(
      startConversation(l1.ctx, l1.actor, { cohortId: w.cohort.id, staffId: w.ids.learner2, body: "hi" }),
    ).rejects.toBeInstanceOf(CommsError);
    convId = await startConversation(l1.ctx, l1.actor, { cohortId: w.cohort.id, staffId: w.ids.facilitator, body: "I'll miss Saturday (fake)." });
    const staffMail = sent("demo.facilitator@example.invalid");
    expect(staffMail).toHaveLength(1);
    expect(staffMail[0]!.text).not.toContain("Saturday");
    expect(await unreadStaffConversations({ db: t.db }, w.ids.facilitator)).toBe(1);
  });

  it("only the two people in the conversation can read it", async () => {
    const fac2 = await w.as(w.ids.facilitator2);
    await expect(getConversation(fac2.ctx, fac2.actor, convId)).rejects.toBeInstanceOf(CommsError);
    const admin = await w.as(w.ids.admin);
    await expect(getConversation(admin.ctx, admin.actor, convId)).rejects.toBeInstanceOf(CommsError);
    const fac = await w.as(w.ids.facilitator);
    const view = await getConversation(fac.ctx, fac.actor, convId);
    expect(view.messages[0]!.body).toBe("I'll miss Saturday (fake).");
    expect(await unreadStaffConversations({ db: t.db }, w.ids.facilitator)).toBe(0);
    await sendMessage(fac.ctx, fac.actor, convId, "Thanks for letting me know (fake).");
    const l1 = await w.as(w.ids.learner1);
    const list = await listLearnerConversations(l1.ctx, l1.actor);
    expect(list[0]!.unread).toBe(true);
    expect(list[0]!.preview).toContain("Thanks");
  });

  it("learners can message the assessor; staff can start a conversation from a learner's enrolment", async () => {
    const l1 = await w.as(w.ids.learner1);
    const a = await startConversation(l1.ctx, l1.actor, { cohortId: w.cohort.id, staffId: w.ids.assessor, body: "Question about my result (fake)." });
    expect(a).not.toBe(convId);
    const fac = await w.as(w.ids.facilitator);
    const enr = await w.enrolmentOf(w.ids.learner3);
    const c = await staffStartConversation(fac.ctx, fac.actor, { enrolmentId: enr.id, body: "How are you getting on? (fake)" });
    const l3 = await w.as(w.ids.learner3);
    expect((await getConversation(l3.ctx, l3.actor, c)).other.role).toBe("facilitator");
    const otherFac = await w.as(w.ids.otherFacilitator);
    await expect(staffStartConversation(otherFac.ctx, otherFac.actor, { enrolmentId: enr.id, body: "x" })).rejects.toBeInstanceOf(CommsError);
  });

  it("messages can be edited for 15 minutes, and reported messages go to SDP admins only", async () => {
    const l1 = await w.as(w.ids.learner1);
    const view = await getConversation(l1.ctx, l1.actor, convId);
    const mine = view.messages.find((m) => m.mine)!;
    await editMessage(l1.ctx, l1.actor, mine.id, "I'll miss Saturday, sorry (fake).");
    const theirs = view.messages.find((m) => !m.mine)!;
    expect(theirs.canReport).toBe(true);
    await reportContent(l1.ctx, l1.actor, { targetType: "direct_message", targetId: theirs.id, reason: "harassment" });
    const fac = await w.as(w.ids.facilitator);
    expect((await listReports(fac.ctx, fac.actor)).some((r) => r.targetType === "direct_message")).toBe(false);
    const admin = await w.as(w.ids.admin);
    const dm = (await listReports(admin.ctx, admin.actor)).find((r) => r.targetType === "direct_message");
    expect(dm?.item?.where).toBe("Private message");
    await resolveReport(admin.ctx, admin.actor, dm!.id, "dismiss");
  });

  it("rate-limits learners: 10 posts or messages per 10 minutes", async () => {
    const l2 = await w.as(w.ids.learner2);
    const c = await startConversation(l2.ctx, l2.actor, { cohortId: w.cohort.id, staffId: w.ids.facilitator2, body: "1" });
    let error: unknown;
    for (let i = 2; i <= 12 && !error; i++) {
      try {
        await sendMessage(l2.ctx, l2.actor, c, String(i));
      } catch (e) {
        error = e;
      }
    }
    expect(error).toMatchObject({ code: "rate_limited" });
    expect((error as Error).message).toBe("You're sending messages quickly. Try again in a few minutes.");
  });
});

describe("support tickets", () => {
  let academic: string;

  it("academic tickets go to the cohort's facilitators with working-day targets", async () => {
    const l3 = await w.as(w.ids.learner3);
    academic = await raiseTicket(l3.ctx, l3.actor, { category: "academic", subject: "Can't follow section 2", body: "Help please (fake)." });
    const [row] = await t.db.select().from(supportTickets).where(eq(supportTickets.id, academic));
    expect(row!.cohortId).toBe(w.cohort.id);
    expect(row!.firstResponseDueAt.getTime()).toBeGreaterThan(row!.createdAt.getTime());
    expect(row!.resolveDueAt.getTime()).toBeGreaterThan(row!.firstResponseDueAt.getTime());
    expect(sent("demo.facilitator@example.invalid")).toHaveLength(1);
    const fac2 = await w.as(w.ids.facilitator2);
    expect((await listStaffTickets(fac2.ctx, fac2.actor)).map((x) => x.id)).toContain(academic);
    const other = await w.as(w.ids.otherFacilitator);
    expect((await listStaffTickets(other.ctx, other.actor)).map((x) => x.id)).not.toContain(academic);
    await expect(getTicket(other.ctx, other.actor, academic, "staff")).rejects.toBeInstanceOf(CommsError);
  });

  it("technical tickets go to SDP admins, not facilitators", async () => {
    const l3 = await w.as(w.ids.learner3);
    const tech = await raiseTicket(l3.ctx, l3.actor, { category: "technical", subject: "Video won't play", body: "It spins (fake)." });
    const fac = await w.as(w.ids.facilitator);
    expect((await listStaffTickets(fac.ctx, fac.actor)).map((x) => x.id)).not.toContain(tech);
    const admin = await w.as(w.ids.admin);
    expect((await listStaffTickets(admin.ctx, admin.actor)).map((x) => x.id)).toContain(tech);
  });

  it("staff reply starts the clock; resolve → learner reopens → staff close; closed tickets take no replies", async () => {
    const fac = await w.as(w.ids.facilitator);
    await replyToTicket(fac.ctx, fac.actor, academic, "Let's go through it (fake).", "staff");
    let [row] = await t.db.select().from(supportTickets).where(eq(supportTickets.id, academic));
    expect(row!.status).toBe("in_progress");
    expect(row!.firstRespondedAt).not.toBeNull();
    expect(sent(email("learner3")).some((m) => m.subject.startsWith("We replied"))).toBe(true);
    await setTicketStatus(fac.ctx, fac.actor, academic, "resolved");
    const l3 = await w.as(w.ids.learner3);
    await reopenTicket(l3.ctx, l3.actor, academic);
    [row] = await t.db.select().from(supportTickets).where(eq(supportTickets.id, academic));
    expect(row!.status).toBe("open");
    await setTicketStatus(fac.ctx, fac.actor, academic, "closed");
    await expect(replyToTicket(l3.ctx, l3.actor, academic, "one more", "learner")).rejects.toMatchObject({ code: "not_allowed" });
    await expect(reopenTicket(l3.ctx, l3.actor, academic)).rejects.toBeInstanceOf(CommsError);
    const l1 = await w.as(w.ids.learner1);
    await expect(getTicket(l1.ctx, l1.actor, academic, "learner")).rejects.toBeInstanceOf(CommsError);
  });

  it("limits learners to 3 new tickets a day", async () => {
    const l2 = await w.as(w.ids.learner2);
    for (let i = 0; i < 3; i++) await raiseTicket(l2.ctx, l2.actor, { category: "admin", subject: `Q${i}`, body: "x" });
    await expect(raiseTicket(l2.ctx, l2.actor, { category: "admin", subject: "Q4", body: "x" })).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("emails each handler once a day about overdue tickets, without learner names", async () => {
    const l1 = await w.as(w.ids.learner1, () => new Date(Date.now() - 10 * 86_400_000));
    await raiseTicket(l1.ctx, l1.actor, { category: "academic", subject: "Old question", body: "x" });
    const fac = await w.as(w.ids.facilitator);
    expect((await listStaffTickets(fac.ctx, fac.actor, "overdue")).length).toBeGreaterThan(0);
    memoryOutbox.length = 0;
    const r = await runOverdueTicketEmails(fac.ctx);
    expect(r.ran).toBe(true);
    const mail = sent("demo.facilitator@example.invalid");
    expect(mail).toHaveLength(1);
    expect(mail[0]!.text).not.toContain("Learner One");
    expect((await runOverdueTicketEmails(fac.ctx)).ran).toBe(false);
  });
});

describe("at-risk flags", () => {
  async function failSection(userId: string, sectionId: string) {
    const l = await w.as(userId);
    for (let i = 0; i < 3; i++) {
      let view = await getCheckView(l.ctx, l.actor, sectionId);
      if (view.state === "result" && view.canRetry) {
        await retryCheck(l.ctx, l.actor, sectionId);
        view = await getCheckView(l.ctx, l.actor, sectionId);
      }
      if (view.state !== "question") throw new Error(`expected a question, got ${view.state}`);
      const [item] = await t.db.select().from(attemptItems).where(eq(attemptItems.attemptId, view.attemptId));
      const opts = await t.db.select().from(answerOptions).where(eq(answerOptions.questionVersionId, item!.questionVersionId));
      const wrongId = opts.find((o) => !o.isCorrect)!.id;
      const token = Object.keys(item!.optionTokens).find((k) => item!.optionTokens[k] === wrongId)!;
      await submitCheckAnswer(l.ctx, l.actor, view.attemptId, token);
    }
  }

  it("flags learners with 2 all-wrong sections, and learners inactive for 7 days; staff only", async () => {
    await failSection(w.ids.learner2, w.sections[0]!.id);
    await failSection(w.ids.learner2, w.sections[1]!.id);
    // learner3: enrolled 10 days ago, no learning activity.
    const enr3 = await w.enrolmentOf(w.ids.learner3);
    await t.db.update(enrolments).set({ enrolledAt: new Date(Date.now() - 10 * 86_400_000) }).where(eq(enrolments.id, enr3.id));
    const fac = await w.as(w.ids.facilitator);
    const risk = await cohortRisk(fac.ctx, fac.actor, w.cohort.id);
    const enr2 = await w.enrolmentOf(w.ids.learner2);
    expect(risk.get(enr2.id)).toEqual([{ kind: "failed_checks", sections: 2 }]);
    expect(risk.get(enr3.id)?.[0]?.kind).toBe("inactive");
    // learner1 enrolled today and has been active, so is not flagged.
    expect(risk.has((await w.enrolmentOf(w.ids.learner1)).id)).toBe(false);
    expect(await atRiskCount(fac.ctx, fac.actor)).toBeGreaterThanOrEqual(2);
    const learner = await w.as(w.ids.learner1);
    await expect(cohortRisk(learner.ctx, learner.actor, w.cohort.id)).rejects.toBeInstanceOf(AccessDeniedError);
    const other = await w.as(w.ids.otherFacilitator);
    await expect(cohortRisk(other.ctx, other.actor, w.cohort.id)).rejects.toBeInstanceOf(AccessDeniedError);
  });
});

describe("section notes", () => {
  it("are per cohort, need valid recording links, and show only to that cohort", async () => {
    const fac = await w.as(w.ids.facilitator);
    const sectionId = w.sections[0]!.id;
    await expect(
      addSectionNote(fac.ctx, fac.actor, { cohortId: w.cohort.id, sectionId, body: "", recordingUrl: "https://example.com/v.mp4", recordingLabel: "" }),
    ).rejects.toBeInstanceOf(CommsError);
    await expect(
      addSectionNote(fac.ctx, fac.actor, { cohortId: w.cohort.id, sectionId, body: "", recordingUrl: "", recordingLabel: "" }),
    ).rejects.toBeInstanceOf(CommsError);
    await addSectionNote(fac.ctx, fac.actor, {
      cohortId: w.cohort.id,
      sectionId,
      body: "Tip: watch the subnet demo from our 4 Nov session (fake).",
      recordingUrl: "https://youtu.be/fake",
      recordingLabel: "Subnet demo",
    });
    const l1 = await w.as(w.ids.learner1);
    const notes = await notesForSection(l1.ctx, l1.actor, sectionId);
    expect(notes).toHaveLength(1);
    expect(notes[0]!.recordingLabel).toBe("Subnet demo");
    const outsider = await w.as(w.ids.otherLearner);
    expect(await notesForSection(outsider.ctx, outsider.actor, sectionId)).toHaveLength(0);
    const other = await w.as(w.ids.otherFacilitator);
    await expect(
      addSectionNote(other.ctx, other.actor, { cohortId: w.cohort.id, sectionId, body: "x", recordingUrl: "", recordingLabel: "" }),
    ).rejects.toBeInstanceOf(AccessDeniedError);
  });
});

describe("live sessions", () => {
  let sessionId: string;
  const inDays = (d: number) => toSastLocal(new Date(Date.now() + d * 86_400_000));

  it("accept Zoom links only and email learners an invite when scheduled", async () => {
    const fac = await w.as(w.ids.facilitator);
    await expect(
      scheduleSession(fac.ctx, fac.actor, { cohortId: w.cohort.id, title: "Q&A", details: "", startsAt: inDays(2), durationMinutes: 60, joinUrl: "https://meet.google.com/abc" }),
    ).rejects.toBeInstanceOf(CommsError);
    sessionId = await scheduleSession(fac.ctx, fac.actor, {
      cohortId: w.cohort.id,
      moduleId: w.km.id,
      title: "Subnetting Q&A",
      details: "Bring questions (fake).",
      startsAt: inDays(2),
      durationMinutes: 60,
      joinUrl: "https://us02web.zoom.us/j/123456789",
    });
    const mail = sent(email("learner1"));
    expect(mail).toHaveLength(1);
    expect(mail[0]!.subject).toContain("New live session");
    expect(mail[0]!.attachments?.[0]?.content).toContain("SEQUENCE:0");
    const l1 = await w.as(w.ids.learner1);
    const s = await learnerSessions(l1.ctx, l1.actor, w.qualificationId);
    expect(s.upcoming.map((x) => x.id)).toContain(sessionId);
    expect(s.upcoming[0]!.joinUrl).toContain("zoom.us");
  });

  it("emails learners on change (even with digest preferences) and on cancellation", async () => {
    const fac = await w.as(w.ids.facilitator);
    await updateSession(fac.ctx, fac.actor, sessionId, {
      title: "Subnetting Q&A",
      details: "Bring questions (fake).",
      startsAt: inDays(3),
      durationMinutes: 60,
      joinUrl: "https://us02web.zoom.us/j/123456789",
    });
    expect(sent(email("learner2"))[0]!.subject).toContain("Session changed");
    expect(sent(email("learner2"))[0]!.attachments?.[0]?.content).toContain("SEQUENCE:1");
    memoryOutbox.length = 0;
    // No real change: no email.
    await updateSession(fac.ctx, fac.actor, sessionId, {
      title: "Subnetting Q&A",
      details: "Updated notes (fake).",
      startsAt: inDays(3),
      durationMinutes: 60,
      joinUrl: "https://us02web.zoom.us/j/123456789",
    });
    expect(memoryOutbox).toHaveLength(0);
    const temp = await scheduleSession(fac.ctx, fac.actor, { cohortId: w.cohort.id, title: "Extra", details: "", startsAt: inDays(4), durationMinutes: 30, joinUrl: "https://zoom.us/j/9" });
    memoryOutbox.length = 0;
    await cancelSession(fac.ctx, fac.actor, temp);
    expect(sent(email("learner1"))[0]!.attachments?.[0]?.content).toContain("METHOD:CANCEL");
  });

  it("records attendance once started and adds the recording without emailing", async () => {
    const fac = await w.as(w.ids.facilitator);
    const enr = await w.enrolmentOf(w.ids.learner1);
    await expect(setSessionAttendance(fac.ctx, fac.actor, sessionId, enr.id, "present")).rejects.toMatchObject({ code: "not_allowed" });
    const past = await scheduleSession(fac.ctx, fac.actor, { cohortId: w.cohort.id, title: "Intro to networks", details: "", startsAt: inDays(-1), durationMinutes: 60, joinUrl: "https://zoom.us/j/1" });
    await setSessionAttendance(fac.ctx, fac.actor, past, enr.id, "late");
    await setSessionAttendance(fac.ctx, fac.actor, past, enr.id, "present");
    const otherEnr = await w.enrolmentOf(w.ids.otherLearner);
    await expect(setSessionAttendance(fac.ctx, fac.actor, past, otherEnr.id, "present")).rejects.toBeInstanceOf(CommsError);
    memoryOutbox.length = 0;
    await expect(addRecording(fac.ctx, fac.actor, past, "https://example.com/x")).rejects.toBeInstanceOf(CommsError);
    await addRecording(fac.ctx, fac.actor, past, "https://us02web.zoom.us/rec/share/abc");
    expect(memoryOutbox).toHaveLength(0);
    const l1 = await w.as(w.ids.learner1);
    const view = await getSessionForViewer(l1.ctx, l1.actor, past);
    expect(view.attendance).toBe("present");
    expect(view.session.recordingUrl).toContain("/rec/");
    const outsider = await w.as(w.ids.otherLearner);
    await expect(getSessionForViewer(outsider.ctx, outsider.actor, past)).rejects.toBeInstanceOf(CommsError);
  });
});

describe("communication log export", () => {
  const today = new Date(Date.now() + 2 * 3_600_000).toISOString().slice(0, 10);
  const from = new Date(Date.now() - 30 * 86_400_000 + 2 * 3_600_000).toISOString().slice(0, 10);

  it("is for SDP admins and evaluators only", async () => {
    const fac = await w.as(w.ids.facilitator);
    await expect(exportCommsLog(fac.ctx, fac.actor, { cohortId: w.cohort.id, from, to: today, format: "csv" })).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("includes every channel, hidden items and earlier versions, and audits the checksum", async () => {
    const ev = await w.as(w.ids.evaluator);
    const log = await buildCommsLog(ev.ctx, ev.actor, w.cohort.id, new Date(Date.now() - 30 * 86_400_000), new Date(Date.now() + 7 * 86_400_000));
    const channels = new Set(log.entries.map((e) => e.channel));
    for (const c of ["Announcement", "Discussion", "Direct message", "Support ticket", "Live session", "Attendance", "Section note"]) expect(channels).toContain(c);
    expect(log.entries.some((e) => e.flags.includes("hidden by a facilitator"))).toBe(true);
    expect(log.entries.some((e) => e.flags.startsWith("earlier version") && e.text === "Is subnetting in the exam? (fake)")).toBe(true);
    // Only this cohort: nothing from the other cohort's people.
    const [outsider] = await t.db.select({ name: users.displayName }).from(users).where(eq(users.id, w.ids.otherLearner));
    expect(log.entries.some((e) => e.author === outsider!.name || e.recipient === outsider!.name)).toBe(false);

    const csv = await exportCommsLog(ev.ctx, ev.actor, { cohortId: w.cohort.id, from, to: today, format: "csv" });
    const text = new TextDecoder().decode(csv.bytes);
    expect(text).toContain("Venue change for Saturday");
    expect(text).toContain("I'll miss Saturday");
    const pdf = await exportCommsLog(ev.ctx, ev.actor, { cohortId: w.cohort.id, from, to: today, format: "pdf" });
    expect(new TextDecoder().decode(pdf.bytes.slice(0, 5))).toBe("%PDF-");
    expect(await auditActions(t.db, w.ids.evaluator)).toContain("comms.log.exported");
    await expect(
      exportCommsLog(ev.ctx, ev.actor, { cohortId: w.cohort.id, from: today, to: from, format: "csv" }),
    ).rejects.toBeInstanceOf(CommsError);
  });
});
