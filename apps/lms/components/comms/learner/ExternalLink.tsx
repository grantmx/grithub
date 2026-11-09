import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";
import styles from "../learner.module.css";

/** A link that leaves the LMS: new tab, no referrer, and says so to screen readers. */
export function ExternalLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className ?? styles.actionLink}>
      {children}
      <Icon name="link" size={18} />
      <span className={styles.srOnly}> (opens in a new tab)</span>
    </a>
  );
}
