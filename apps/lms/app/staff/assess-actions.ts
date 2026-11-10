"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/access";
import { AssessmentError } from "@/lib/server/assessments";
import { AccessDeniedError } from "@/lib/server/auth";
import { createQuestionVersion, retireQuestion, type VersionInput } from "@/lib/server/authoring";
import { recordDecision, saveDecisionDraft, saveItemMarks } from "@/lib/server/marking";
import { closeBatch, completeActions, decideAppeal, moderateDecision, setSample } from "@/lib/server/moderation";
import {
  addExtraTime,
  setAttendance,
  setIdVerified,
  setPaused,
  signOffRegister,
  unlockPaper,
} from "@/lib/server/register";
import { addLink, PracticalError } from "@/lib/server/practical";
import { recordPracticalDecision, savePracticalDraft, saveJudgements } from "@/lib/server/practicalMarking";
import { startObservation } from "@/lib/server/register";
import { InputError, has, id, ids, prefixed, text, texts } from "@/lib/server/input";
import { getActor, getServerCtx } from "@/lib/server/request";

/**
 * Staff assessment actions. Every write goes through `authorize` (role +
 * passkey where required) and cohort scope checks in lib/server/*, in
 * addition to the proxy. Plain form posts that redirect back with a status.
 */


function withParam(path: string, key: string, value: string) {
  const [base, hash] = path.split("#");
  const sep = base!.includes("?") ? "&" : "?";
  return `${base}${sep}${key}=${encodeURIComponent(value)}${hash ? `#${hash}` : ""}`;
}

async function run(back: string, fn: (ctx: Awaited<ReturnType<typeof getServerCtx>>, actor: Awaited<ReturnType<typeof getActor>>) => Promise<string | void>) {
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  const to = safeNext(back, "/staff");
  let done: string | void;
  try {
    done = await fn(ctx, actor);
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
    if (e instanceof AssessmentError || e instanceof PracticalError || e instanceof InputError) redirect(withParam(to, "error", e.message));
    throw e;
  }
  redirect(typeof done === "string" ? withParam(to, "done", done) : to);
}

// --- Register ---------------------------------------------------------------

export async function attendanceAction(form: FormData) {
  await run(text(form, "back"), (ctx, actor) =>
    setAttendance(ctx, actor, id(form, "dayId"), id(form, "enrolmentId"), text(form, "status")),
  );
}

export async function idCheckAction(form: FormData) {
  await run(text(form, "back"), (ctx, actor) =>
    setIdVerified(ctx, actor, id(form, "dayId"), id(form, "enrolmentId"), text(form, "verified") === "1"),
  );
}

export async function unlockAction(form: FormData) {
  await run(text(form, "back"), async (ctx, actor) => {
    await unlockPaper(ctx, actor, id(form, "scheduleId"), id(form, "enrolmentId"));
    return "unlocked";
  });
}

export async function pauseAction(form: FormData) {
  await run(text(form, "back"), (ctx, actor) => setPaused(ctx, actor, id(form, "attemptId"), text(form, "paused") === "1"));
}

export async function extraTimeAction(form: FormData) {
  await run(text(form, "back"), async (ctx, actor) => {
    await addExtraTime(ctx, actor, id(form, "attemptId"), Number.parseInt(text(form, "minutes"), 10));
    return "extra_time";
  });
}

export async function signOffAction(form: FormData) {
  await run(text(form, "back"), async (ctx, actor) => {
    if (text(form, "confirm") !== "1") throw new AssessmentError("invalid_answer", "Tick the box to confirm the sign-off.");
    await signOffRegister(ctx, actor, id(form, "dayId"));
    return "signed_off";
  });
}

// --- Marking ----------------------------------------------------------------

export async function marksAction(form: FormData) {
  const marks: Record<string, number> = {};
  for (const [criterionId, v] of prefixed(form, "c:")) {
    if (v !== "") marks[criterionId] = Number.parseInt(v, 10);
  }
  await run(text(form, "back"), async (ctx, actor) => {
    await saveItemMarks(ctx, actor, id(form, "attemptId"), Number.parseInt(text(form, "position"), 10), marks, text(form, "note"));
    return "marked";
  });
}

export async function decisionAction(form: FormData) {
  const intent = text(form, "intent");
  await run(text(form, "back"), async (ctx, actor) => {
    const attemptId = id(form, "attemptId");
    const outcome = text(form, "outcome");
    const feedback = text(form, "feedback");
    if (intent === "draft") {
      await saveDecisionDraft(ctx, actor, attemptId, outcome || null, feedback);
      return "draft";
    }
    if (text(form, "confirm") !== "1") {
      await saveDecisionDraft(ctx, actor, attemptId, outcome || null, feedback);
      throw new AssessmentError("invalid_answer", "Tick the box to confirm the decision is final. Your draft was saved.");
    }
    await recordDecision(ctx, actor, attemptId, outcome, feedback);
    return "decided";
  });
}

// --- Moderation and appeals -------------------------------------------------

export async function moderateAction(form: FormData) {
  await run(text(form, "back"), async (ctx, actor) => {
    if (text(form, "confirm") !== "1") throw new AssessmentError("invalid_answer", "Tick the box to confirm your moderation.");
    await moderateDecision(ctx, actor, id(form, "decisionId"), text(form, "verdict"), text(form, "comments"), text(form, "actions"));
    return "moderated";
  });
}

export async function setSampleAction(form: FormData) {
  await run(text(form, "back"), async (ctx, actor) => {
    const selected = ids(form, "sample");
    const { added, removed } = await setSample(ctx, actor, id(form, "batchId"), selected);
    return `sample:${added}:${removed}`;
  });
}

export async function completeActionsAction(form: FormData) {
  await run(text(form, "back"), async (ctx, actor) => {
    await completeActions(ctx, actor, id(form, "moderationRecordId"), text(form, "note"));
    return "actions_done";
  });
}

export async function closeBatchAction(form: FormData) {
  await run(text(form, "back"), async (ctx, actor) => {
    if (text(form, "confirm") !== "1") throw new AssessmentError("invalid_answer", "Tick the box to confirm the release.");
    const n = await closeBatch(ctx, actor, id(form, "batchId"));
    return `released:${n}`;
  });
}

export async function appealDecisionAction(form: FormData) {
  await run(text(form, "back"), async (ctx, actor) => {
    if (text(form, "confirm") !== "1") throw new AssessmentError("invalid_answer", "Tick the box to confirm the outcome is final.");
    await decideAppeal(ctx, actor, id(form, "appealId"), text(form, "outcome"), text(form, "notes"));
    return "appeal_decided";
  });
}

// --- Questions --------------------------------------------------------------

export async function retireQuestionAction(form: FormData) {
  await run(text(form, "back"), async (ctx, actor) => {
    await retireQuestion(ctx, actor, id(form, "questionId"));
    return "retired";
  });
}

export async function newVersionAction(form: FormData) {
  const questionId = id(form, "questionId");
  const options: VersionInput["options"] = [];
  const criteria: VersionInput["criteria"] = [];
  const correct = texts(form, "correct", 8, 10);
  for (let i = 0; i < 8; i++) {
    const label = text(form, `opt${i}`);
    if (label.trim()) {
      const pin = text(form, `pin${i}`);
      options.push({ label, correct: correct.includes(String(i)), pinned: pin === "" ? null : Number.parseInt(pin, 10) });
    }
    const crit = text(form, `crit${i}`);
    if (crit.trim()) {
      criteria.push({ label: crit, guidance: text(form, `guide${i}`), maxMarks: Number.parseInt(text(form, `max${i}`), 10) });
    }
  }
  await run(text(form, "back"), async (ctx, actor) => {
    const { warnings } = await createQuestionVersion(ctx, actor, questionId, {
      stem: text(form, "stem"),
      feedback: text(form, "feedback"),
      options,
      criteria,
    });
    return warnings.length ? `versioned:${warnings.join(" ")}` : "versioned";
  });
}

// --- Practical --------------------------------------------------------------

/** Register: start an observed task for a learner, then go to its marking view. */
export async function observeAction(form: FormData) {
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  const back = safeNext(text(form, "back"), "/staff/assessment-days");
  let submissionId: string;
  try {
    submissionId = await startObservation(ctx, actor, id(form, "scheduleId"), id(form, "enrolmentId"));
  } catch (e) {
    if (e instanceof AccessDeniedError) redirect(e.decision.result === "stepup" ? `/account/passkeys?required=1&next=${encodeURIComponent(back)}` : "/forbidden");
    if (e instanceof AssessmentError || e instanceof PracticalError || e instanceof InputError) redirect(withParam(back, "error", e.message));
    throw e;
  }
  redirect(`/staff/marking/practical/${submissionId}`);
}

export async function judgementsAction(form: FormData) {
  const input: Record<string, { met: boolean; comment: string }> = {};
  for (const [criterionId, v] of prefixed(form, "met:")) {
    if (v === "met" || v === "not_met") {
      input[criterionId] = { met: v === "met", comment: text(form, `comment:${criterionId}`) };
    }
  }
  const notes = has(form, "observationNotes") ? text(form, "observationNotes") : undefined;
  await run(text(form, "back"), async (ctx, actor) => {
    await saveJudgements(ctx, actor, id(form, "submissionId"), input, notes);
    return "judged";
  });
}

export async function practicalDecisionAction(form: FormData) {
  const intent = text(form, "intent");
  await run(text(form, "back"), async (ctx, actor) => {
    const submissionId = id(form, "submissionId");
    const outcome = text(form, "outcome");
    const feedback = text(form, "feedback");
    if (intent === "draft") {
      await savePracticalDraft(ctx, actor, submissionId, outcome || null, feedback);
      return "draft";
    }
    if (text(form, "confirm") !== "1") {
      await savePracticalDraft(ctx, actor, submissionId, outcome || null, feedback);
      throw new AssessmentError("invalid_answer", "Tick the box to confirm the decision is final. Your draft was saved.");
    }
    await recordPracticalDecision(ctx, actor, submissionId, outcome, feedback);
    return "decided";
  });
}

/** Assessor adds a link (e.g. their own video) to an observed submission. */
export async function assessorLinkAction(form: FormData) {
  await run(text(form, "back"), async (ctx, actor) => {
    if (!actor) throw new AccessDeniedError({ result: "signin" });
    await addLink(ctx, actor, id(form, "submissionId"), text(form, "url"));
    return "evidence_added";
  });
}
