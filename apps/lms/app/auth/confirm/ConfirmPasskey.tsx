"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  browserSupportsWebAuthn,
  startAuthentication,
} from "@simplewebauthn/browser";
import ui from "@/components/ui.module.css";
import { completePasskeyConfirm, getPasskeyConfirmOptions } from "../actions";

/**
 * Opens the passkey dialog as soon as the page loads (design decision
 * 2026-11-11). If it's cancelled, fails or the browser blocks it, the
 * person can try again or continue without the passkey.
 */
export function ConfirmPasskey() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  async function confirm() {
    setError(undefined);
    setBusy(true);
    try {
      if (!browserSupportsWebAuthn()) {
        setError("This browser doesn't support passkeys.");
        return;
      }
      const opts = await getPasskeyConfirmOptions();
      if (!opts.ok) {
        setError(opts.error);
        return;
      }
      const response = await startAuthentication({ optionsJSON: opts.data });
      const result = await completePasskeyConfirm(response);
      if (result.ok) router.push("/");
      else setError(result.error);
    } catch {
      setError(
        "The passkey check was cancelled or isn't available on this device.",
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void confirm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={ui.stack}>
      <p>Use your passkey (fingerprint, face or screen lock) to confirm it&apos;s you.</p>
      {error ? (
        <p role="alert" className={ui.bannerError}>
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className={`${ui.button} ${ui.full}`}
        onClick={() => void confirm()}
        disabled={busy}
      >
        {busy ? "Waiting for your passkey…" : "Use my passkey"}
      </button>
      <a href="/" className={ui.textButton}>
        Continue without passkey
      </a>
    </div>
  );
}
