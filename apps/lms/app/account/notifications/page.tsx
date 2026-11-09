import type { Metadata } from "next";
import { emailPrefsAction } from "@/app/(learn)/comms-actions";
import { AuthPage } from "@/components/AuthPage";
import styles from "@/components/comms/learner.module.css";
import { Notice } from "@/components/comms/learner/Notice";
import ui from "@/components/ui.module.css";
import { type EmailPrefs, type Frequency, getEmailPrefs } from "@/lib/server/notify";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Email notifications" };

const TYPES: { key: keyof EmailPrefs; label: string }[] = [
  { key: "announcements", label: "Announcements" },
  { key: "discussions", label: "Discussion replies" },
  { key: "messages", label: "Private messages" },
  { key: "tickets", label: "Help ticket updates" },
];

const CHOICES: { value: Frequency; label: string }[] = [
  { value: "instant", label: "Straight away" },
  { value: "digest", label: "Weekly summary (Mondays)" },
  { value: "off", label: "Off" },
];

/**
 * Email preferences (design.md §3 and §14, 2026-11-08): optional types are
 * instant, weekly digest or off; essential emails always go out. The bell
 * still shows everything. TODO(copy): wording to be supplied by GRIT Hub.
 */
export default async function EmailPrefsPage({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const { ctx, actor } = await requirePage("/account/notifications");
  const sp = await searchParams;
  const prefs = await getEmailPrefs(ctx, actor.userId);
  return (
    <AuthPage title="Email notifications">
      <Notice done={sp.done} error={sp.error} />
      <p className={ui.hint}>Choose when we email you. Everything still shows under the bell in the app.</p>
      <form action={emailPrefsAction} className={styles.form}>
        {TYPES.map((t) => (
          <fieldset key={t.key} className={styles.fieldset}>
            <legend className={styles.legend}>{t.label}</legend>
            {CHOICES.map((c) => (
              <label key={c.value} className={styles.radio}>
                <input type="radio" name={t.key} value={c.value} defaultChecked={prefs[t.key] === c.value} />
                {c.label}
              </label>
            ))}
          </fieldset>
        ))}
        <div className={styles.actions}>
          <button type="submit" className={ui.button}>
            Save
          </button>
          <a href="/more" className={ui.secondary}>
            Back
          </a>
        </div>
      </form>
      <div className={ui.bannerInfo}>
        <p style={{ margin: 0 }}>
          <strong>We always email you about:</strong> sign-in links and invitations, results being released, changes to assessment days
          and live sessions, and deadlines.
        </p>
      </div>
    </AuthPage>
  );
}
