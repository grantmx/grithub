import type { ReactNode } from "react";
import { savePreferencesAction } from "@/app/(learn)/actions";
import type { Preferences } from "@/lib/server/preferences";
import { Icon } from "./Icon";
import type { IconName } from "./icons.generated";
import { NavLink } from "./NavLink";
import styles from "./AppShell.module.css";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/learn", label: "Learn", icon: "learn" },
  { href: "/library", label: "Library", icon: "library" },
  { href: "/messages", label: "Messages", icon: "messages" },
  { href: "/more", label: "More", icon: "more" },
];

const SIZES: { value: Preferences["textSize"]; label: string; name: string }[] =
  [
    { value: "s", label: "S", name: "Small" },
    { value: "m", label: "M", name: "Medium" },
    { value: "l", label: "L", name: "Large" },
    { value: "xl", label: "XL", name: "Extra large" },
  ];

// White by default (design.md §14, 2026-11-11): the stored "system" value
// means light, and the phone/laptop setting is not followed.
const THEMES: { value: Preferences["theme"]; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/**
 * Learner shell (design.md §3, §14 2026-11-08): top bar on laptops (Home ·
 * Learn · Library · Messages · More + bell + Display menu), bottom bar on
 * phones; the bell (in-app notifications) shows on every size. Display menu = text size and
 * theme, saved per user; plain forms, so it works without JavaScript.
 */
export function AppShell({
  prefs,
  unread = 0,
  children,
}: {
  prefs: Preferences;
  /** Unread in-app notifications (the bell's dot). */
  unread?: number;
  children: ReactNode;
}) {
  return (
    <div
      className={styles.shell}
      data-theme={prefs.theme === "dark" ? "dark" : "light"}
      data-text-size={prefs.textSize}
    >
      <header className={styles.top}>
        <a href="/" aria-label="GRIT Hub Learning home">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo */}
          <img
            className={styles.logo}
            src={
              prefs.theme === "dark"
                ? "/brand/grithub-logo-horz-white.svg"
                : "/brand/grithub-logo-horz.svg"
            }
            alt=""
            width={120}
            height={34}
          />
        </a>
        <nav aria-label="Main" className={styles.topNav}>
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              className={styles.navLink}
              exact={item.href === "/"}
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <span className={styles.spacer} />
        <a href="/notifications" className={styles.bell}>
          <Icon name="notifications" size={24} />
          <span className={styles.srOnly}>
            Notifications{unread > 0 ? `, ${unread} unread` : ""}
          </span>
          {unread > 0 ? <span className={styles.dot} aria-hidden="true" /> : null}
        </a>
        <details className={styles.display}>
          <summary aria-label="Display settings">
            <Icon name="textSize" size={24} />
            <span aria-hidden="true">Aa</span>
          </summary>
          <div className={styles.displayPanel}>
            <form action={savePreferencesAction}>
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Text size</legend>
                <div className={styles.segmented}>
                  {SIZES.map((s) => (
                    <button
                      key={s.value}
                      type="submit"
                      name="textSize"
                      value={s.value}
                      className={styles.segment}
                      aria-pressed={prefs.textSize === s.value}
                      aria-label={`${s.name} text`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </form>
            <form action={savePreferencesAction}>
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Theme</legend>
                <div className={styles.segmented}>
                  {THEMES.map((t) => (
                    <button
                      key={t.value}
                      type="submit"
                      name="theme"
                      value={t.value}
                      className={styles.segment}
                      aria-pressed={(prefs.theme === "dark" ? "dark" : "light") === t.value}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </form>
          </div>
        </details>
      </header>

      <main id="main" className={styles.main}>
        {children}
      </main>

      <nav aria-label="Main" className={styles.bottomNav}>
        {NAV.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            className={styles.bottomLink}
            exact={item.href === "/"}
          >
            <Icon name={item.icon} size={24} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
