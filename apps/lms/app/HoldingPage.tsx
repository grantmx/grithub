import type { ReactNode } from "react";
import styles from "./HoldingPage.module.css";

type HoldingPageProps = {
  title: string;
  message: string;
  /** Optional notice shown above the heading (e.g. the passkey reminder). */
  notice?: ReactNode;
};

/**
 * Minimal holding page (design-gate decision, docs/lms/design.md §14).
 * Logo + heading + one line; tokens only. Copy is a placeholder: TODO(copy).
 */
export function HoldingPage({ title, message, notice }: HoldingPageProps) {
  return (
    <main id="main" className={styles.page}>
      <div className={styles.content}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo */}
        <img
          className={styles.logo}
          src="/brand/grithub-logo-horz.svg"
          alt="GRIT Hub"
          width={200}
          height={56}
        />
        {notice}
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.message}>{message}</p>
      </div>
    </main>
  );
}
