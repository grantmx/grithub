"use server";

import { redirect } from "next/navigation";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import {
  AccessDeniedError,
  AuthError,
  authorize,
  passkeyConfirmOptions,
  signInWithLink,
  verifyPasskeyConfirm,
} from "@/lib/server/auth";
import { afterLinkSignIn } from "@/lib/access";
import { InputError, checkJsonObject, text } from "@/lib/server/input";
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

/** POST-only exchange of an emailed sign-in or recovery link. */
export async function consumeSignInLink(form: FormData): Promise<void> {
  const token = linkToken(form);
  const ctx = await getServerCtx();
  let target: string;
  try {
    const result = await signInWithLink(ctx, token, "link");
    if (!result.ok) redirect(`/signin?error=link_${result.reason}`);
    await setSessionCookie(ctx, result.token, result.expiresAt);
    target = afterLinkSignIn(
      result.method,
      result.method === "recovery" ? null : await getActor({ ...ctx }),
    );
  } catch (e) {
    if (e instanceof RateLimitError) redirect("/signin?error=link_invalid");
    throw e;
  }
  redirect(target);
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
export async function acceptInvitation(form: FormData): Promise<void> {
  const token = linkToken(form);
  const ctx = await getServerCtx();
  const result = await signInWithLink(ctx, token, "invitation").catch(
    (e: unknown) => {
      if (e instanceof RateLimitError)
        return { ok: false as const, reason: "invalid" as const };
      throw e;
    },
  );
  if (!result.ok)
    redirect(`/setup/${encodeURIComponent(token)}?error=${result.reason}`);
  await setSessionCookie(ctx, result.token, result.expiresAt);
  redirect("/setup");
}
