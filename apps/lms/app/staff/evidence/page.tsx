import { HoldingPage } from "../../HoldingPage";
import { requirePage } from "@/lib/server/page";

export const metadata = { title: "Evidence" };

export default async function StaffEvidencePage() {
  await requirePage("/staff/evidence");
  // TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
  return <HoldingPage title="Evidence" message="Coming soon." />;
}
