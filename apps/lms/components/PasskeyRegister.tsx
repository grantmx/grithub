"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  browserSupportsWebAuthn,
  startRegistration,
} from "@simplewebauthn/browser";
import {
  completePasskeyRegistration,
  getPasskeyRegistrationOptions,
} from "@/app/account/actions";
import ui from "./ui.module.css";

function guessLabel(): string {
  if (typeof navigator === "undefined") return "Passkey";
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return "iPhone or iPad";
  if (/Android/.test(ua)) return "Android phone";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows computer";
  return "Passkey";
}

/** Register a passkey on this device, then go to `doneHref`. */
export function PasskeyRegister({
  doneHref,
  buttonLabel = "Add a passkey",
}: {
  doneHref: string;
  buttonLabel?: string;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("Passkey");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(browserSupportsWebAuthn());
    setLabel(guessLabel());
  }, []);

  async function register() {
    setError(undefined);
    setBusy(true);
    try {
      const opts = await getPasskeyRegistrationOptions();
      if (!opts.ok) {
        setError(opts.error);
        return;
      }
      const response = await startRegistration({ optionsJSON: opts.data });
      const result = await completePasskeyRegistration(response, label);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(doneHref);
      router.refresh();
    } catch {
      setError(
        "Passkey setup was cancelled, or this device already has a passkey for your account.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <p className={ui.bannerInfo}>
        This browser doesn&apos;t support passkeys. You can keep signing in with
        email links, or try another device.
      </p>
    );
  }

  return (
    <div className={ui.stack}>
      {error ? (
        <p role="alert" className={ui.bannerError}>
          {error}
        </p>
      ) : null}
      <div className={ui.field}>
        <label htmlFor="passkey-label" className={ui.label}>
          Name this device
        </label>
        <input
          id="passkey-label"
          className={ui.input}
          value={label}
          maxLength={60}
          onChange={(e) => setLabel(e.target.value)}
        />
        <p className={ui.hint}>
          So you can recognise it later, for example &quot;Work laptop&quot;.
        </p>
      </div>
      <button
        type="button"
        className={`${ui.button} ${ui.full}`}
        onClick={register}
        disabled={busy}
      >
        {busy ? "Follow the prompt on your device…" : buttonLabel}
      </button>
    </div>
  );
}
