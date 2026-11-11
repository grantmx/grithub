import type { ReactNode } from "react";
import ui from "./ui.module.css";

/** Narrow, centred page used by sign-in, links and setup (holding-page style). */
export function AuthPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main id="main" className={ui.narrowPage}>
      <div className={ui.narrow}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo */}
        <img
          className={ui.logo}
          src="/brand/grithub-logo-horz.svg"
          alt="GRIT Hub"
          width={160}
          height={45}
        />
        <h1 className={ui.h1}>{title}</h1>
        {children}
      </div>
    </main>
  );
}
