"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  WebAuthnAbortService,
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  startAuthentication,
} from "@simplewebauthn/browser";
import ui from "@/components/ui.module.css";
import {
  completePasskeySignIn,
  getPasskeySignInOptions,
  sendMagicLink,
} from "./actions";

/**
 * Sign-in (design-gate decision: email field + passkey first, magic link as a
 * quieter fallback). The email field has autocomplete="username webauthn" so
 * the browser offers passkeys as soon as it is focused (conditional UI).
 */
export function SignInForm({
  next,
  initialError,
}: {
  next: string | null;
  initialError?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>(initialError);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);
  const [linkState, linkAction, linkPending] = useActionState(
    sendMagicLink,
    {},
  );
  const started = useRef(false);

  async function finish(
    response: Awaited<ReturnType<typeof startAuthentication>>,
  ) {
    const result = await completePasskeySignIn(response, next);
    if (result.ok) router.push(result.data.redirectTo);
    else setError(result.error);
  }

  // Conditional UI: start a background passkey request tied to autofill.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    setSupported(browserSupportsWebAuthn());
    void (async () => {
      if (!(await browserSupportsWebAuthnAutofill())) return;
      const opts = await getPasskeySignInOptions();
      if (!opts.ok) return;
      try {
        const response = await startAuthentication({
          optionsJSON: opts.data,
          useBrowserAutofill: true,
        });
        await finish(response);
      } catch {
        // Autofill was dismissed or replaced by the button flow: ignore.
      }
    })();
    return () => WebAuthnAbortService.cancelCeremony();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onPasskeyClick() {
    setError(undefined);
    setBusy(true);
    try {
      const opts = await getPasskeySignInOptions();
      if (!opts.ok) {
        setError(opts.error);
        return;
      }
      const response = await startAuthentication({ optionsJSON: opts.data });
      await finish(response);
    } catch {
      setError(
        "Passkey sign-in was cancelled or isn't available on this device.",
      );
    } finally {
      setBusy(false);
    }
  }

  const shownError = linkState.error ?? error;

  return (
    <div className={ui.stack}>
      {shownError ? (
        <p role="alert" className={ui.bannerError}>
          {shownError}
        </p>
      ) : null}

      <form action={linkAction} className={ui.stack} noValidate>
        <div className={ui.field}>
          <label htmlFor="email" className={ui.label}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username webauthn"
            className={ui.input}
            required
          />
        </div>

        {supported ? (
          <button
            type="button"
            className={`${ui.button} ${ui.full}`}
            onClick={onPasskeyClick}
            disabled={busy}
          >
            {busy ? "Waiting for your passkey…" : "Sign in with passkey"}
          </button>
        ) : (
          <p className={ui.hint}>
            This browser doesn&apos;t support passkeys. Use an email link
            instead.
          </p>
        )}

        <div>
          <p className={ui.muted}>No passkey on this device?</p>
          <button
            type="submit"
            className={ui.textButton}
            disabled={linkPending}
          >
            {linkPending ? "Sending…" : "Email me a sign-in link"}
          </button>
        </div>
      </form>
    </div>
  );
}
