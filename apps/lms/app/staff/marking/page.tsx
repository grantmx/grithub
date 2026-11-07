import { HoldingPage } from "../../HoldingPage";
import { requirePage } from "@/lib/server/page";

export const metadata = { title: "Marking" };

export default async function StaffMarkingPage() {
  await requirePage("/staff/marking");
  // TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
  return <HoldingPage title="Marking" message="Coming soon." />;
}
