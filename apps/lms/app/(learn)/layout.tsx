import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getPreferences } from "@/lib/server/preferences";
import { getActor, getServerCtx } from "@/lib/server/request";

// Learner area: /, /learn/…, /library, /more (proxy enforces sign-in + setup).
export default async function LearnLayout({
  children,
}: {
  children: ReactNode;
}) {
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  if (!actor) redirect("/signin");
  const prefs = await getPreferences(ctx, actor.userId);
  return <AppShell prefs={prefs}>{children}</AppShell>;
}
