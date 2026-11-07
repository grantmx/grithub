import type { Metadata } from "next";
import { AuthPage } from "@/components/AuthPage";
import ui from "@/components/ui.module.css";

export const metadata: Metadata = { title: "Get help signing in" };

// TODO(copy): wording to be supplied by GRIT Hub.
export default function SignInHelpPage() {
  return (
    <AuthPage title="Get help signing in">
      <div className={ui.stack}>
        <p className={ui.muted}>
          Still have access to your email? Use{" "}
          <strong>Email me a sign-in link</strong> on the sign-in page, then add
          a passkey on your new device.
        </p>
        <p className={ui.muted}>
          Lost access to your email or all your devices? Contact your
          facilitator or GRIT Hub. An administrator will check your identity (in
          person, on a video call, or by calling a number we already have for
          you) before restoring access. We never use SMS codes.
        </p>
      </div>
      <a href="/signin" className={ui.secondary}>
        Back to sign in
      </a>
    </AuthPage>
  );
}
