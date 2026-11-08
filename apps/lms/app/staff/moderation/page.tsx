import ui from "@/components/ui.module.css";
import { requirePage } from "@/lib/server/page";

export const metadata = { title: "Moderation" };

export default async function StaffModerationPage() {
  await requirePage("/staff/moderation");
  // TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
  return (
    <>
      <h1 className={ui.h1}>Moderation</h1>
      <p className={ui.muted}>Coming soon.</p>
    </>
  );
}
