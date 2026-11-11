import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPage } from "@/components/AuthPage";
import { requirePage } from "@/lib/server/page";
import { ConfirmPasskey } from "./ConfirmPasskey";

export const metadata: Metadata = { title: "Confirm it's you" };

/**
 * Second step after a magic link for people who have a passkey
 * (design.md 2026-11-11). The browser's passkey dialog opens by itself;
 * they can continue without it (a magic link alone is a full sign-in).
 */
// TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
export default async function ConfirmPasskeyPage() {
  const { actor } = await requirePage("/auth/confirm");
  if (actor.activePasskeys === 0) redirect("/account/passkeys?prompt=1");
  return (
    <AuthPage title="Confirm it's you">
      <ConfirmPasskey />
    </AuthPage>
  );
}
