import type { Metadata } from "next";
import { AuthPage } from "@/components/AuthPage";
import ui from "@/components/ui.module.css";

export const metadata: Metadata = { title: "Check your email" };

// Same message whether or not the address has an account (no enumeration).
// TODO(copy): wording to be supplied by GRIT Hub.
export default function CheckEmailPage() {
  return (
    <AuthPage title="Check your email">
      <p className={ui.muted}>
        If that address belongs to a GRIT Hub Learning account, we&apos;ve sent
        a sign-in link. It works once and expires in 15 minutes.
      </p>
      <a href="/signin" className={ui.secondary}>
        Back to sign in
      </a>
    </AuthPage>
  );
}
