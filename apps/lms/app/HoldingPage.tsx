import styles from "./HoldingPage.module.css";

type HoldingPageProps = {
  title: string;
  message: string;
};

/**
 * Minimal holding page (design-gate decision, docs/lms/design.md §14).
 * Logo + heading + one line; tokens only. Copy is a placeholder: TODO(copy).
 */
export function HoldingPage({ title, message }: HoldingPageProps) {
  return (
    <main id="main" className={styles.page}>
      <div className={styles.content}>
        <picture>
          <source
            srcSet="/brand/grithub-logo-horz-white.svg"
            media="(prefers-color-scheme: dark)"
          />
          <img
            className={styles.logo}
            src="/brand/grithub-logo-horz.svg"
            alt="GRIT Hub"
            width={200}
            height={56}
          />
        </picture>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.message}>{message}</p>
      </div>
    </main>
  );
}
