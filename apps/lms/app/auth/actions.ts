"use server";

import { redirect } from "next/navigation";
import { signInWithLink } from "@/lib/server/auth";
import { InputError, text } from "@/lib/server/input";
import { RateLimitError } from "@/lib/server/ratelimit";
import { getActor, getServerCtx, setSessionCookie } from "@/lib/server/request";

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
    if (result.method === "recovery") {
      target = "/account/passkeys?prompt=recovery";
    } else {
      const actor = await getActor({ ...ctx });
      // After the first verified login, prompt for a passkey.
      target = !actor?.setupComplete
        ? "/setup"
        : actor.activePasskeys === 0
          ? "/account/passkeys?prompt=1"
          : "/";
    }
  } catch (e) {
    if (e instanceof RateLimitError) redirect("/signin?error=link_invalid");
    throw e;
  }
  redirect(target);
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
