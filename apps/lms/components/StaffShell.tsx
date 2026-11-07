import type { ReactNode } from "react";
import { NavLink } from "./NavLink";
import styles from "./StaffShell.module.css";

export type NavGroup = {
  label: string;
  items: { href: string; label: string }[];
};

/**
 * Staff/admin shell: left sidebar grouped by role (design.md §3, S-screens).
 * Laptop-first; stacks above the content below 900px. Light theme in the MVP.
 */
export function StaffShell({
  groups,
  children,
}: {
  groups: NavGroup[];
  children: ReactNode;
}) {
  return (
    <div className={styles.shell} data-theme="light">
      <nav className={styles.sidebar} aria-label="Staff navigation">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo */}
        <img
          className={styles.logo}
          src="/brand/grithub-logo-horz.svg"
          alt="GRIT Hub"
          width={140}
          height={39}
        />
        {groups.map((g) => (
          <div key={g.label} className={styles.group}>
            <p className={styles.groupLabel}>{g.label}</p>
            {g.items.map((item) => (
              <NavLink key={item.href} href={item.href} className={styles.link}>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
        <div className={styles.group}>
          <a href="/account/passkeys" className={styles.link}>
            Account &amp; passkeys
          </a>
        </div>
      </nav>
      <main id="main" className={styles.main}>
        {children}
      </main>
    </div>
  );
}
