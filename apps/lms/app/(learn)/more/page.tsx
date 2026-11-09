import type { Metadata } from "next";
import { signOut } from "@/app/account/actions";
import { Icon } from "@/components/Icon";
import styles from "@/components/learn/learn.module.css";
import { requirePage } from "@/lib/server/page";
import { getSetupState } from "@/lib/server/setupState";

export const metadata: Metadata = { title: "More" };

/** More (design-gate decision 2026-11-08): Account & passkeys, QCTO details (learners), Email notifications, Help, Sign out. */
export default async function MorePage() {
  const { ctx, actor } = await requirePage("/more");
  const isLearner = (await getSetupState(ctx, actor.userId))?.isLearner;
  return (
    <div className={styles.stack}>
      <h1 className={styles.pageTitle}>More</h1>
      <ul className={styles.list} style={{ gap: "var(--space-4)" }}>
        <li className={styles.listItem}>
          <Icon name="account" />
          <a href="/account/passkeys" className={styles.textLink}>
            Account &amp; passkeys
          </a>
        </li>
        {isLearner ? (
          <li className={styles.listItem}>
            <Icon name="account" />
            <a href="/account/profile" className={styles.textLink}>
              Your QCTO details
            </a>
          </li>
        ) : null}
        <li className={styles.listItem}>
          <Icon name="notifications" />
          <a href="/account/notifications" className={styles.textLink}>
            Email notifications
          </a>
        </li>
        <li className={styles.listItem}>
          <Icon name="help" />
          <a href="/signin/help" className={styles.textLink}>
            Help signing in
          </a>
        </li>
        <li className={styles.listItem}>
          <Icon name="logout" />
          <form action={signOut}>
            <button
              type="submit"
              className={styles.secondary}
              style={{ padding: 0, border: 0, minHeight: 0 }}
            >
              Sign out
            </button>
          </form>
        </li>
      </ul>
    </div>
  );
}
