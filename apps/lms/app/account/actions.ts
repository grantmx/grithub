"use server";

import { redirect } from "next/navigation";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { writeAudit } from "@/lib/server/audit";
import {
  AuthError,
  passkeyRegistrationOptions,
  revokeOwnPasskey,
  verifyPasskeyRegistration,
} from "@/lib/server/auth";
import { InputError, checkJsonObject, checkText, id } from "@/lib/server/input";
import { RateLimitError } from "@/lib/server/ratelimit";
import {
  clearSessionCookie,
  getActor,
  getServerCtx,
  setChallengeCookie,
  takeChallengeCookie,
} from "@/lib/server/request";
import { revokeSession } from "@/lib/server/session";

type Result<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const message = (e: unknown) =>
  e instanceof AuthError || e instanceof RateLimitError || e instanceof InputError
    ? e.message
    : "Something went wrong. Please try again.";

export async function getPasskeyRegistrationOptions(): Promise<
  Result<PublicKeyCredentialCreationOptionsJSON>
> {
  try {
    const ctx = await getServerCtx();
    const { options, challengeId } = await passkeyRegistrationOptions(
      ctx,
      await getActor(ctx),
    );
    await setChallengeCookie(ctx, challengeId);
    return { ok: true, data: options };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function completePasskeyRegistration(
  response: RegistrationResponseJSON,
  label: string,
): Promise<Result> {
  try {
    checkJsonObject(response);
    const ctx = await getServerCtx();
    await verifyPasskeyRegistration(
      ctx,
      await getActor(ctx),
      await takeChallengeCookie(),
      response,
      checkText(label, 1000),
    );
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function revokePasskey(form: FormData): Promise<void> {
  const ctx = await getServerCtx();
  try {
    await revokeOwnPasskey(
      ctx,
      await getActor(ctx),
      id(form, "passkeyId"),
    );
  } catch (e) {
    if (e instanceof AuthError) redirect(`/account/passkeys?error=${e.code}`);
    if (e instanceof InputError) redirect("/account/passkeys?error=not_found");
    throw e;
  }
  redirect("/account/passkeys?revoked=1");
}

export async function signOut(): Promise<void> {
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  if (actor) {
    await revokeSession(ctx, actor.sessionId);
    await writeAudit(ctx, {
      action: "auth.signout",
      actorId: actor.userId,
      entityType: "session",
      entityId: actor.sessionId,
    });
  }
  await clearSessionCookie(ctx);
  redirect("/signin");
}
