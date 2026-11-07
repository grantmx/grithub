import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Admin" };

// Admin area: /admin/… StaffShell with admin navigation comes later.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div data-area="admin">{children}</div>;
}
