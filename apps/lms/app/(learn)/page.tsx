import ui from "@/components/ui.module.css";
import { requirePage } from "@/lib/server/page";
import { HoldingPage } from "../HoldingPage";

export default async function LearnerHomePage() {
  const { actor } = await requirePage("/");
  // Gentle reminder for learners who skipped passkey setup (design-gate decision).
  const notice =
    actor.activePasskeys === 0 ? (
      <p className={ui.bannerInfo}>
        Sign in faster next time: <a href="/account/passkeys">add a passkey</a>.
      </p>
    ) : null;
  // TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
  return (
    <HoldingPage
      title="GRIT Hub Learning"
      message="Coming soon."
      notice={notice}
    />
  );
}
