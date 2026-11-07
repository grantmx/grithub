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
  if (e instanceof RateLimitError || e instanceof AuthError) return e.message;
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
    const ctx = await getServerCtx();
    const session = await verifyPasskeySignIn(
      ctx,
      await takeChallengeCookie(),
      response,
    );
    await setSessionCookie(ctx, session.token, session.expiresAt);
    return { ok: true, data: { redirectTo: safeNext(next) } };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export type MagicLinkState = { error?: string };

export async function sendMagicLink(
  _prev: MagicLinkState,
  form: FormData,
): Promise<MagicLinkState> {
  const email = String(form.get("email") ?? "");
  if (!email.includes("@")) return { error: "Enter your email address." };
  try {
    await requestMagicLink(await getServerCtx(), email);
  } catch (e) {
    return { error: errorMessage(e) };
  }
  redirect("/signin/check-email");
}
