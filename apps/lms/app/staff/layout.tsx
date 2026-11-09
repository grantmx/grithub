import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { type NavGroup, StaffShell } from "@/components/StaffShell";
import { atRiskCount } from "@/lib/server/atRisk";
import { openReportCount } from "@/lib/server/contentReports";
import { unreadStaffConversations } from "@/lib/server/messages";
import { unseenFeedbackCount } from "@/lib/server/moderation";
import { overdueTicketCount } from "@/lib/server/tickets";
import { getActor, getServerCtx } from "@/lib/server/request";

export const metadata: Metadata = { title: "Staff" };

// Staff area: /staff/… (roles enforced per route in proxy.ts / lib/access.ts).
export default async function StaffLayout({
  children,
}: {
  children: ReactNode;
}) {
  const ctx = await getServerCtx();
  const actor = await getActor(ctx);
  if (!actor) redirect("/signin");
  const groups: NavGroup[] = [];
  const isFacilitator = actor.roles.has("facilitator");
  // Direct messages: facilitators and assessors only (design.md §14, 2026-11-08).
  const unreadMessages =
    isFacilitator || actor.roles.has("assessor") ? await unreadStaffConversations(ctx, actor.userId) : 0;
  if (isFacilitator || actor.roles.has("sdp_admin")) {
    const [atRisk, overdue, reports] = await Promise.all([
      atRiskCount(ctx, actor),
      overdueTicketCount(ctx, actor),
      openReportCount(ctx, actor),
    ]);
    groups.push({
      label: "Facilitator",
      items: [
        { href: "/staff/progress", label: "Learner progress", badge: atRisk || undefined },
        { href: "/staff/announcements", label: "Announcements" },
        { href: "/staff/discussions", label: "Discussions" },
        ...(isFacilitator ? [{ href: "/staff/messages", label: "Messages", badge: unreadMessages || undefined }] : []),
        { href: "/staff/tickets", label: "Support tickets", badge: overdue || undefined },
        { href: "/staff/reports", label: "Reports", badge: reports || undefined },
        { href: "/staff/sessions", label: "Live sessions" },
        { href: "/staff/section-notes", label: "Section notes" },
        { href: "/staff/assessment-days", label: "Assessment days" },
      ],
    });
  }
  if (actor.roles.has("assessor")) {
    const unseen = await unseenFeedbackCount(ctx, actor.userId);
    groups.push({
      label: "Assessor",
      items: [
        { href: "/staff/marking", label: "Marking queue" },
        ...(isFacilitator ? [] : [{ href: "/staff/messages", label: "Messages", badge: unreadMessages || undefined }]),
        { href: "/staff/moderation-feedback", label: "Moderation feedback", badge: unseen || undefined },
        { href: "/staff/assessment-days", label: "Assessment days" },
        { href: "/staff/analytics", label: "Question analytics" },
      ],
    });
  }
  if (actor.roles.has("moderator"))
    groups.push({
      label: "Moderator",
      items: [
        { href: "/staff/moderation", label: "Moderation sample" },
        { href: "/staff/materials", label: "Assessment materials" },
        { href: "/staff/appeals", label: "Appeals" },
        { href: "/staff/analytics", label: "Question analytics" },
      ],
    });
  if (actor.roles.has("external_evaluator") || actor.roles.has("sdp_admin")) {
    groups.push({
      label: "Evidence",
      items: [
        { href: "/staff/evidence", label: "Evidence" },
        { href: "/staff/evidence/communication", label: "Communication log" },
      ],
    });
  }
  if (actor.roles.has("sdp_admin"))
    groups.push({
      label: "Admin",
      items: [{ href: "/admin/people", label: "People" }],
    });
  return <StaffShell groups={groups}>{children}</StaffShell>;
}
