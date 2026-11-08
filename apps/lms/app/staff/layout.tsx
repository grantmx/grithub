import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { type NavGroup, StaffShell } from "@/components/StaffShell";
import { getActor, getServerCtx } from "@/lib/server/request";

export const metadata: Metadata = { title: "Staff" };

// Staff area: /staff/… (roles enforced per route in proxy.ts / lib/access.ts).
export default async function StaffLayout({
  children,
}: {
  children: ReactNode;
}) {
  const actor = await getActor(await getServerCtx());
  if (!actor) redirect("/signin");
  const groups: NavGroup[] = [];
  if (actor.roles.has("facilitator") || actor.roles.has("sdp_admin")) {
    groups.push({
      label: "Facilitator",
      items: [
        { href: "/staff/progress", label: "Learner progress" },
        { href: "/staff/assessment-days", label: "Assessment days" },
      ],
    });
  }
  if (actor.roles.has("assessor"))
    groups.push({
      label: "Assessor",
      items: [
        { href: "/staff/marking", label: "Marking queue" },
        { href: "/staff/assessment-days", label: "Assessment days" },
        { href: "/staff/analytics", label: "Question analytics" },
      ],
    });
  if (actor.roles.has("moderator"))
    groups.push({
      label: "Moderator",
      items: [
        { href: "/staff/moderation", label: "Moderation sample" },
        { href: "/staff/appeals", label: "Appeals" },
        { href: "/staff/analytics", label: "Question analytics" },
      ],
    });
  if (actor.roles.has("external_evaluator") || actor.roles.has("sdp_admin")) {
    groups.push({
      label: "Evidence",
      items: [{ href: "/staff/evidence", label: "Evidence" }],
    });
  }
  if (actor.roles.has("sdp_admin"))
    groups.push({
      label: "Admin",
      items: [{ href: "/admin/people", label: "People" }],
    });
  return <StaffShell groups={groups}>{children}</StaffShell>;
}
