"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  className,
  exact = false,
  children,
}: {
  href: string;
  className?: string;
  exact?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const current =
    pathname === href || (!exact && pathname.startsWith(`${href}/`));
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
