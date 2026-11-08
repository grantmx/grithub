import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StaffShell } from "@/components/StaffShell";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Admin" };

// Admin area: /admin/… (SDP admin + passkey; enforced in proxy, here, and in every action).
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePage("/admin");
  return (
    <StaffShell
      groups={[
        {
          label: "Admin",
          items: [
            { href: "/admin/people", label: "People" },
            { href: "/admin/cohorts", label: "Cohorts" },
            { href: "/admin/assessments", label: "Assessments" },
          ],
        },
      ]}
    >
      {children}
    </StaffShell>
  );
}
