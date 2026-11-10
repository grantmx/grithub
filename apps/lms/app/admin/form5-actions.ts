"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/access";
import { AccessDeniedError } from "@/lib/server/auth";
import { logRestoreTest } from "@/lib/server/backup";
import { CommsError } from "@/lib/server/comms";
import { confirmGuideUpload, recordCurriculumReference, recordDocument } from "@/lib/server/complianceDocs";
import { RateLimitError } from "@/lib/server/ratelimit";
import { getActor, getServerCtx } from "@/lib/server/request";

/**
 * Form 5 readiness actions (design.md §14, 2026-11-09), SDP admins only.
 * Authorised again in lib/server/*. Plain form posts that redirect back
 * with ?done= / ?error=; the guide confirmation returns a result for the uploader.
 */

const str = (form: FormData, key: string) => String(form.get(key) ?? "");

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
    if (e instanceof CommsError) redirect(withParam(to, "error", e.message));
    if (e instanceof RateLimitError) redirect(withParam(to, "error", "Too many tries. Please wait a few minutes."));
    throw e;
  }
  redirect(withParam(to, "done", done));
}

export async function recordDocumentAction(form: FormData) {
  await run(str(form, "back"), "document", (ctx, actor) =>
    recordDocument(ctx, actor, {
      itemCode: str(form, "itemCode"),
      title: str(form, "title"),
      issuer: str(form, "issuer"),
      location: str(form, "location"),
      validUntil: str(form, "validUntil"),
      notes: str(form, "notes"),
    }),
  );
}

export async function curriculumReferenceAction(form: FormData) {
  await run(str(form, "back"), "curriculum", (ctx, actor) =>
    recordCurriculumReference(ctx, actor, {
      qualificationId: str(form, "qualificationId"),
      documentTitle: str(form, "documentTitle"),
      curriculumCode: str(form, "curriculumCode"),
      version: str(form, "version"),
      location: str(form, "location"),
      note: str(form, "note"),
    }),
  );
}

export async function restoreTestAction(form: FormData) {
  await run(str(form, "back"), "restore", (ctx, actor) =>
    logRestoreTest(ctx, actor, { testedOn: str(form, "testedOn"), result: str(form, "result"), notes: str(form, "notes") }),
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
      qualificationId: String(qualificationId),
      pathname: String(pathname),
      title: String(title),
      version: String(version),
      issuedOn: String(issuedOn),
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof CommsError) return { ok: false, message: e.message };
    if (e instanceof AccessDeniedError) return { ok: false, message: "You don't have access to do that." };
    if (e instanceof RateLimitError) return { ok: false, message: "Too many tries. Please wait a few minutes." };
    throw e;
  }
}
