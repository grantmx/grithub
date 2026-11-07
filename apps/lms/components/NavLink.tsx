"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const current = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <a
      href={href}
      className={className}
      aria-current={current ? "page" : undefined}
    >
      {children}
    </a>
  );
}
