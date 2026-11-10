"use server";

import { redirect } from "next/navigation";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { safeNext } from "@/lib/access";
import {
  AuthError,
  passkeySignInOptions,
  requestMagicLink,
  verifyPasskeySignIn,
} from "@/lib/server/auth";
import { InputError, checkJsonObject, checkText, text } from "@/lib/server/input";
import { RateLimitError } from "@/lib/server/ratelimit";
import {
  getServerCtx,
  setChallengeCookie,
  setSessionCookie,
  takeChallengeCookie,
} from "@/lib/server/request";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function errorMessage(e: unknown): string {
  if (e instanceof RateLimitError || e instanceof AuthError || e instanceof InputError) return e.message;
  return "Something went wrong. Please try again.";
}

export async function getPasskeySignInOptions(): Promise<
  ActionResult<PublicKeyCredentialRequestOptionsJSON>
> {
  try {
    const ctx = await getServerCtx();
    const { options, challengeId } = await passkeySignInOptions(ctx);
    await setChallengeCookie(ctx, challengeId);
    return { ok: true, data: options };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function completePasskeySignIn(
  response: AuthenticationResponseJSON,
  next: string | null,
): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    checkJsonObject(response);
    const nextPath = next === null ? null : checkText(next, 2000);
    const ctx = await getServerCtx();
    const session = await verifyPasskeySignIn(
      ctx,
      await takeChallengeCookie(),
      response,
    );
    await setSessionCookie(ctx, session.token, session.expiresAt);
    return { ok: true, data: { redirectTo: safeNext(nextPath) } };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export type MagicLinkState = { error?: string };

export async function sendMagicLink(
  _prev: MagicLinkState,
  form: FormData,
): Promise<MagicLinkState> {
  let email: string;
  try {
    email = text(form, "email", 1000);
  } catch (e) {
    return { error: errorMessage(e) };
  }
  if (!email.includes("@")) return { error: "Enter your email address." };
  try {
    await requestMagicLink(await getServerCtx(), email);
  } catch (e) {
    return { error: errorMessage(e) };
  }
  redirect("/signin/check-email");
}
