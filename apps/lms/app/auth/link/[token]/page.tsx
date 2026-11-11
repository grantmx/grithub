import type { Metadata } from "next";
import { AuthPage } from "@/components/AuthPage";
import { LinkActionForm } from "@/components/LinkActionForm";
import ui from "@/components/ui.module.css";
import { consumeSignInLink } from "../../actions";

export const metadata: Metadata = { title: "Sign in", referrer: "no-referrer" };

/**
 * Landing page for emailed sign-in and recovery links. Opening the link does
 * nothing by itself; the token is used only when the person presses the
 * button (POST), so email security scanners can't use up the link.
 */
export default async function SignInLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <AuthPage title="Continue signing in">
      {/* TODO(copy): pending label to be supplied by GRIT Hub. */}
      <LinkActionForm
        action={consumeSignInLink}
        token={token}
        label="Continue"
        pendingLabel="Signing you in…"
        className={ui.stack}
      />
    </AuthPage>
  );
}
