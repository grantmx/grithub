import ui from "@/components/ui.module.css";
import { requirePage } from "@/lib/server/page";

export const metadata = { title: "Marking" };

export default async function StaffMarkingPage() {
  await requirePage("/staff/marking");
  // TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
  return (
    <>
      <h1 className={ui.h1}>Marking</h1>
      <p className={ui.muted}>Coming soon.</p>
    </>
  );
}
