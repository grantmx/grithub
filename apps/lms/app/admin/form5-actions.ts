"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/access";
import { AccessDeniedError } from "@/lib/server/auth";
import { logRestoreTest } from "@/lib/server/backup";
import { CommsError } from "@/lib/server/comms";
import { confirmGuideUpload, recordCurriculumReference, recordDocument } from "@/lib/server/complianceDocs";
import { InputError, checkId, checkText, id, text } from "@/lib/server/input";
import { RateLimitError } from "@/lib/server/ratelimit";
import { getActor, getServerCtx } from "@/lib/server/request";

/**
 * Form 5 readiness actions (design.md §14, 2026-11-09), SDP admins only.
 * Authorised again in lib/server/*. Plain form posts that redirect back
 * with ?done= / ?error=; the guide confirmation returns a result for the uploader.
 */


function withParam(path: string, key: "done" | "error", value: string) {
  const u = new URL(path, "http://x.invalid");
  u.searchParams.delete("done");
  u.searchParams.delete("error");
  u.searchParams.set(key, value);
  return `${u.pathname}${u.search}${u.hash}`;
}

type Ctx = Awaited<ReturnType<typeof getServerCtx>>;
type Actor = Awaited<ReturnType<typeof getActor>>;

async function run(back: string, done: string, fn: (ctx: Ctx, actor: Actor) => Promise<void>) {
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  const to = safeNext(back, "/admin/form5");
  try {
    await fn(ctx, actor);
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
    if (e instanceof CommsError || e instanceof InputError) redirect(withParam(to, "error", e.message));
    if (e instanceof RateLimitError) redirect(withParam(to, "error", "Too many tries. Please wait a few minutes."));
    throw e;
  }
  redirect(withParam(to, "done", done));
}

export async function recordDocumentAction(form: FormData) {
  await run(text(form, "back"), "document", (ctx, actor) =>
    recordDocument(ctx, actor, {
      itemCode: text(form, "itemCode"),
      title: text(form, "title"),
      issuer: text(form, "issuer"),
      location: text(form, "location"),
      validUntil: text(form, "validUntil"),
      notes: text(form, "notes"),
    }),
  );
}

export async function curriculumReferenceAction(form: FormData) {
  await run(text(form, "back"), "curriculum", (ctx, actor) =>
    recordCurriculumReference(ctx, actor, {
      qualificationId: id(form, "qualificationId"),
      documentTitle: text(form, "documentTitle"),
      curriculumCode: text(form, "curriculumCode"),
      version: text(form, "version"),
      location: text(form, "location"),
      note: text(form, "note"),
    }),
  );
}

export async function restoreTestAction(form: FormData) {
  await run(text(form, "back"), "restore", (ctx, actor) =>
    logRestoreTest(ctx, actor, { testedOn: text(form, "testedOn"), result: text(form, "result"), notes: text(form, "notes") }),
  );
}

export type GuideResult = { ok: true } | { ok: false; message: string };

/** Called by the guide uploader after the direct upload finishes. */
export async function confirmGuideAction(
  qualificationId: string,
  pathname: string,
  title: string,
  version: string,
  issuedOn: string,
): Promise<GuideResult> {
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  try {
    await confirmGuideUpload(ctx, actor, {
      qualificationId: checkId(qualificationId),
      pathname: checkText(pathname, 1000),
      title: checkText(title),
      version: checkText(version),
      issuedOn: checkText(issuedOn),
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof CommsError || e instanceof InputError) return { ok: false, message: e.message };
    if (e instanceof AccessDeniedError) return { ok: false, message: "You don't have access to do that." };
    if (e instanceof RateLimitError) return { ok: false, message: "Too many tries. Please wait a few minutes." };
    throw e;
  }
}
