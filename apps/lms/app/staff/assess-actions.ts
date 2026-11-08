"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/access";
import { AssessmentError } from "@/lib/server/assessments";
import { AccessDeniedError } from "@/lib/server/auth";
import { createQuestionVersion, retireQuestion, type VersionInput } from "@/lib/server/authoring";
import { recordDecision, saveDecisionDraft, saveItemMarks } from "@/lib/server/marking";
import { closeBatch, decideAppeal, moderateDecision } from "@/lib/server/moderation";
import {
  addExtraTime,
  setAttendance,
  setIdVerified,
  setPaused,
  signOffRegister,
  unlockPaper,
} from "@/lib/server/register";
import { getActor, getServerCtx } from "@/lib/server/request";

/**
 * Staff assessment actions. Every write goes through `authorize` (role +
 * passkey where required) and cohort scope checks in lib/server/*, in
 * addition to the proxy. Plain form posts that redirect back with a status.
 */

const str = (form: FormData, key: string) => String(form.get(key) ?? "");

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
    if (e instanceof AssessmentError) redirect(withParam(to, "error", e.message));
    throw e;
  }
  redirect(typeof done === "string" ? withParam(to, "done", done) : to);
}

// --- Register ---------------------------------------------------------------

export async function attendanceAction(form: FormData) {
  await run(str(form, "back"), (ctx, actor) =>
    setAttendance(ctx, actor, str(form, "dayId"), str(form, "enrolmentId"), str(form, "status")),
  );
}

export async function idCheckAction(form: FormData) {
  await run(str(form, "back"), (ctx, actor) =>
    setIdVerified(ctx, actor, str(form, "dayId"), str(form, "enrolmentId"), str(form, "verified") === "1"),
  );
}

export async function unlockAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    await unlockPaper(ctx, actor, str(form, "scheduleId"), str(form, "enrolmentId"));
    return "unlocked";
  });
}

export async function pauseAction(form: FormData) {
  await run(str(form, "back"), (ctx, actor) => setPaused(ctx, actor, str(form, "attemptId"), str(form, "paused") === "1"));
}

export async function extraTimeAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    await addExtraTime(ctx, actor, str(form, "attemptId"), Number.parseInt(str(form, "minutes"), 10));
    return "extra_time";
  });
}

export async function signOffAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    if (form.get("confirm") !== "1") throw new AssessmentError("invalid_answer", "Tick the box to confirm the sign-off.");
    await signOffRegister(ctx, actor, str(form, "dayId"));
    return "signed_off";
  });
}

// --- Marking ----------------------------------------------------------------

export async function marksAction(form: FormData) {
  const marks: Record<string, number> = {};
  for (const [k, v] of form.entries()) {
    if (k.startsWith("c:") && String(v) !== "") marks[k.slice(2)] = Number.parseInt(String(v), 10);
  }
  await run(str(form, "back"), async (ctx, actor) => {
    await saveItemMarks(ctx, actor, str(form, "attemptId"), Number.parseInt(str(form, "position"), 10), marks, str(form, "note"));
    return "marked";
  });
}

export async function decisionAction(form: FormData) {
  const intent = str(form, "intent");
  await run(str(form, "back"), async (ctx, actor) => {
    const attemptId = str(form, "attemptId");
    const outcome = str(form, "outcome");
    const feedback = str(form, "feedback");
    if (intent === "draft") {
      await saveDecisionDraft(ctx, actor, attemptId, outcome || null, feedback);
      return "draft";
    }
    if (form.get("confirm") !== "1") {
      await saveDecisionDraft(ctx, actor, attemptId, outcome || null, feedback);
      throw new AssessmentError("invalid_answer", "Tick the box to confirm the decision is final. Your draft was saved.");
    }
    await recordDecision(ctx, actor, attemptId, outcome, feedback);
    return "decided";
  });
}

// --- Moderation and appeals -------------------------------------------------

export async function moderateAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    await moderateDecision(ctx, actor, str(form, "decisionId"), str(form, "outcome"), str(form, "findings"));
    return "moderated";
  });
}

export async function closeBatchAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    if (form.get("confirm") !== "1") throw new AssessmentError("invalid_answer", "Tick the box to confirm the release.");
    const n = await closeBatch(ctx, actor, str(form, "batchId"));
    return `released:${n}`;
  });
}

export async function appealDecisionAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    if (form.get("confirm") !== "1") throw new AssessmentError("invalid_answer", "Tick the box to confirm the outcome is final.");
    await decideAppeal(ctx, actor, str(form, "appealId"), str(form, "outcome"), str(form, "notes"));
    return "appeal_decided";
  });
}

// --- Questions --------------------------------------------------------------

export async function retireQuestionAction(form: FormData) {
  await run(str(form, "back"), async (ctx, actor) => {
    await retireQuestion(ctx, actor, str(form, "questionId"));
    return "retired";
  });
}

export async function newVersionAction(form: FormData) {
  const questionId = str(form, "questionId");
  const options: VersionInput["options"] = [];
  const criteria: VersionInput["criteria"] = [];
  for (let i = 0; i < 8; i++) {
    const label = str(form, `opt${i}`);
    if (label.trim()) {
      const pin = str(form, `pin${i}`);
      options.push({ label, correct: form.getAll("correct").map(String).includes(String(i)), pinned: pin === "" ? null : Number.parseInt(pin, 10) });
    }
    const crit = str(form, `crit${i}`);
    if (crit.trim()) {
      criteria.push({ label: crit, guidance: str(form, `guide${i}`), maxMarks: Number.parseInt(str(form, `max${i}`), 10) });
    }
  }
  await run(str(form, "back"), async (ctx, actor) => {
    const { warnings } = await createQuestionVersion(ctx, actor, questionId, {
      stem: str(form, "stem"),
      feedback: str(form, "feedback"),
      options,
      criteria,
    });
    return warnings.length ? `versioned:${warnings.join(" ")}` : "versioned";
  });
}
