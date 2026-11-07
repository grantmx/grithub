import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Staff" };

// Staff area: /staff/… StaffShell (design.md §8) comes later.
export default function StaffLayout({ children }: { children: ReactNode }) {
  return <div data-area="staff">{children}</div>;
}
