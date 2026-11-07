import { HoldingPage } from "../../HoldingPage";
import { requirePage } from "@/lib/server/page";

export const metadata = { title: "Moderation" };

export default async function StaffModerationPage() {
  await requirePage("/staff/moderation");
  // TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
  return <HoldingPage title="Moderation" message="Coming soon." />;
}
