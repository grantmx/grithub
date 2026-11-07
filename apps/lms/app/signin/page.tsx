import type { Metadata } from "next";
import { AuthPage } from "@/components/AuthPage";
import ui from "@/components/ui.module.css";
import { safeNext } from "@/lib/access";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in" };

// TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
const LINK_ERRORS: Record<string, string> = {
  link_expired: "That sign-in link has expired. Request a new one below.",
  link_used:
    "That sign-in link has already been used. Request a new one below.",
  link_revoked:
    "That sign-in link was replaced by a newer one. Use the latest email, or request a new link.",
  link_invalid: "That sign-in link isn't valid. Request a new one below.",
  link_deactivated:
    "This account has been deactivated. Contact GRIT Hub if you think this is a mistake.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <AuthPage title="Sign in">
      <SignInForm
        next={next ? safeNext(next) : null}
        initialError={error ? LINK_ERRORS[error] : undefined}
      />
      <p className={ui.hint}>
        <a href="/signin/help">Lost access? Get help ›</a>
      </p>
    </AuthPage>
  );
}
