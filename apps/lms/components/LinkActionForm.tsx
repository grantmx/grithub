"use client";

import { useActionState } from "react";
import type { LinkFormState } from "@/app/auth/actions";
import ui from "./ui.module.css";

/**
 * The one-button form on emailed sign-in and invitation links. Shows that
 * something is happening while the link is checked, and says so plainly if
 * it fails, instead of leaving the button looking dead. Works without
 * JavaScript too (the form posts and redirects as before).
 */
export function LinkActionForm({
  action,
  token,
  label,
  pendingLabel,
  className,
}: {
  action: (state: LinkFormState, form: FormData) => Promise<LinkFormState>;
  token: string;
  label: string;
  pendingLabel: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {state.error ? (
        <p role="alert" className={ui.bannerError}>
          {state.error}
        </p>
      ) : null}
      <input type="hidden" name="token" value={token} />
      <button
        type="submit"
        className={`${ui.button} ${ui.full}`}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? pendingLabel : label}
      </button>
    </form>
  );
}
