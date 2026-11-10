import ui from "@/components/ui.module.css";
import { requirePage } from "@/lib/server/page";

export const metadata = { title: "Evidence" };

export default async function StaffEvidencePage() {
  await requirePage("/staff/evidence");
  // TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
  return (
    <>
      <h1 className={ui.h1}>Evidence</h1>
      <ul>
        <li>
          <a href="/staff/evidence/form5">Form 5 readiness</a>: every QCTO Form 5 section 4 item with its live status and evidence, and
          the one-click evidence pack (PDF).
        </li>
        <li>
          <a href="/staff/evidence/communication">Communication log</a>: announcements, discussions, messages, support tickets and live
          sessions per cohort (CSV or PDF).
        </li>
      </ul>
      <p className={ui.muted}>More evidence views are coming.</p>
    </>
  );
}
