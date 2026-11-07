import type { Metadata } from "next";
import { AuthPage } from "@/components/AuthPage";
import ui from "@/components/ui.module.css";

export const metadata: Metadata = { title: "No access" };

// TODO(copy): wording to be supplied by GRIT Hub.
export default function ForbiddenPage() {
  return (
    <AuthPage title="You don't have access to this page">
      <p className={ui.muted}>
        If you think you should, ask a GRIT Hub administrator to check your
        role.
      </p>
      <a href="/" className={ui.secondary}>
        Go to home
      </a>
    </AuthPage>
  );
}
