import type { Metadata } from "next";
import { AuthPage } from "@/components/AuthPage";
import { LinkActionForm } from "@/components/LinkActionForm";
import ui from "@/components/ui.module.css";
import { acceptInvitation } from "../../auth/actions";

export const metadata: Metadata = { title: "Welcome", referrer: "no-referrer" };

// TODO(copy): wording to be supplied by GRIT Hub.
const ERRORS: Record<string, string> = {
  expired:
    "This invitation has expired. Ask your facilitator or GRIT Hub to send a new one.",
  used: "This invitation has already been used. Sign in instead, or ask for a new invitation.",
  revoked:
    "This invitation was replaced by a newer one. Use the most recent email.",
  invalid:
    "This invitation link isn't valid. Check you used the full link from the email.",
  deactivated:
    "This account has been deactivated. Contact GRIT Hub if you think this is a mistake.",
};

/** Invitation landing: nothing happens until "Get started" is pressed (POST). */
export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  if (error) {
    return (
      <AuthPage title="We couldn't open this invitation">
        <p role="alert" className={ui.bannerError}>
          {ERRORS[error] ?? ERRORS.invalid}
        </p>
        <a href="/signin" className={ui.secondary}>
          Go to sign in
        </a>
      </AuthPage>
    );
  }
  return (
    <AuthPage title="Welcome to GRIT Hub Learning">
      <p className={ui.muted}>
        Setting up your account takes three short steps: confirm your details,
        read how we use your information, and add a passkey so you can sign in
        quickly and safely.
      </p>
      {/* TODO(copy): pending label to be supplied by GRIT Hub. */}
      <LinkActionForm
        action={acceptInvitation}
        token={token}
        label="Get started"
        pendingLabel="Opening your invitation…"
        className={ui.stack}
      />
    </AuthPage>
  );
}
