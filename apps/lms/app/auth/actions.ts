"use server";

import { redirect } from "next/navigation";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import {
  AccessDeniedError,
  AuthError,
  type LinkSignInResult,
  authorize,
  passkeyConfirmOptions,
  signInWithLink,
  verifyPasskeyConfirm,
} from "@/lib/server/auth";
import { afterLinkSignIn } from "@/lib/access";
import { InputError, checkJsonObject, text } from "@/lib/server/input";
import type { ServerCtx } from "@/lib/server/context";
import { RateLimitError } from "@/lib/server/ratelimit";
import {
  getActor,
  getServerCtx,
  setChallengeCookie,
  setSessionCookie,
  takeChallengeCookie,
} from "@/lib/server/request";

/** The token from a link form; a malformed one is treated as an invalid link. */
function linkToken(form: FormData): string {
  try {
    return text(form, "token", 1000);
  } catch (e) {
    if (e instanceof InputError) redirect("/signin?error=link_invalid");
    throw e;
  }
}

/** State for the link forms: set only when something unexpected failed. */
export type LinkFormState = { error?: string };

// TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
const LINK_FAILED =
  "Something went wrong on our side and you're not signed in yet. Your link still works, so please try again in a minute.";

/**
 * Log an unexpected failure without personal data. Drizzle's "Failed query"
 * message includes the query parameters (token and session hashes), so only
 * the database's own message is logged for those.
 */
function logLinkFailure(where: string, e: unknown): void {
  const err = e instanceof Error ? e : new Error(String(e));
  const message =
    err.cause instanceof Error
      ? err.cause.message
      : err.message.startsWith("Failed query")
        ? "query failed"
        : err.message;
  console.error(`[auth] ${where} failed: ${err.name}: ${message}`);
}

/**
 * Where to go after a link sign-in. The session already exists at this
 * point, so if looking up the account fails we still send the person on
 * (the proxy routes them to setup if needed) rather than lose the sign-in.
 */
async function linkTarget(
  ctx: ServerCtx,
  method: Parameters<typeof afterLinkSignIn>[0],
): Promise<string> {
  if (method === "recovery") return afterLinkSignIn(method, null);
  try {
    return afterLinkSignIn(method, await getActor({ ...ctx }));
  } catch (e) {
    logLinkFailure("linkTarget", e);
    return "/";
  }
}

/** POST-only exchange of an emailed sign-in or recovery link. */
export async function consumeSignInLink(
  _prev: LinkFormState,
  form: FormData,
): Promise<LinkFormState> {
  const token = linkToken(form);
  let ctx: ServerCtx;
  let result: LinkSignInResult;
  try {
    ctx = await getServerCtx();
    result = await signInWithLink(ctx, token, "link");
  } catch (e) {
    if (e instanceof RateLimitError) redirect("/signin?error=link_invalid");
    logLinkFailure("consumeSignInLink", e);
    return { error: LINK_FAILED };
  }
  if (!result.ok) redirect(`/signin?error=link_${result.reason}`);
  await setSessionCookie(ctx, result.token, result.expiresAt);
  redirect(await linkTarget(ctx, result.method));
}

export type ConfirmResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function confirmError(e: unknown): string {
  if (
    e instanceof AuthError ||
    e instanceof RateLimitError ||
    e instanceof InputError
  )
    return e.message;
  if (e instanceof AccessDeniedError) return "Please sign in first.";
  return "Something went wrong. Please try again.";
}

/** Options for the passkey confirmation step after a magic link. */
export async function getPasskeyConfirmOptions(): Promise<
  ConfirmResult<PublicKeyCredentialRequestOptionsJSON>
> {
  try {
    const ctx = await getServerCtx();
    const actor = await authorize(
      ctx,
      await getActor(ctx),
      { kind: "user" },
      "auth.passkeyConfirmOptions",
    );
    const { options, challengeId } = await passkeyConfirmOptions(ctx, actor);
    await setChallengeCookie(ctx, challengeId);
    return { ok: true, data: options };
  } catch (e) {
    return { ok: false, error: confirmError(e) };
  }
}

/** Verify the passkey confirmation (audited; doesn't change access). */
export async function completePasskeyConfirm(
  response: AuthenticationResponseJSON,
): Promise<ConfirmResult> {
  try {
    checkJsonObject(response);
    const ctx = await getServerCtx();
    const actor = await authorize(
      ctx,
      await getActor(ctx),
      { kind: "user" },
      "auth.passkeyConfirm",
    );
    await verifyPasskeyConfirm(
      ctx,
      actor,
      await takeChallengeCookie(),
      response,
    );
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: confirmError(e) };
  }
}

/** POST-only exchange of an invitation link; continues to first-time setup. */
export async function acceptInvitation(
  _prev: LinkFormState,
  form: FormData,
): Promise<LinkFormState> {
  const token = linkToken(form);
  let ctx: ServerCtx;
  let result: LinkSignInResult;
  try {
    ctx = await getServerCtx();
    result = await signInWithLink(ctx, token, "invitation");
  } catch (e) {
    if (e instanceof RateLimitError)
      redirect(`/setup/${encodeURIComponent(token)}?error=invalid`);
    logLinkFailure("acceptInvitation", e);
    return { error: LINK_FAILED };
  }
  if (!result.ok)
    redirect(`/setup/${encodeURIComponent(token)}?error=${result.reason}`);
  await setSessionCookie(ctx, result.token, result.expiresAt);
  redirect("/setup");
}
