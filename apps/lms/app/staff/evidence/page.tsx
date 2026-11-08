import ui from "@/components/ui.module.css";
import { requirePage } from "@/lib/server/page";

export const metadata = { title: "Evidence" };

export default async function StaffEvidencePage() {
  await requirePage("/staff/evidence");
  // TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
  return (
    <>
      <h1 className={ui.h1}>Evidence</h1>
      <p className={ui.muted}>Coming soon.</p>
    </>
  );
}
