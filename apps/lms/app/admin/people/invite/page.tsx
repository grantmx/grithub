import type { Metadata } from "next";
import ui from "@/components/ui.module.css";
import { listCohorts } from "@/lib/server/onboarding";
import { requirePage } from "@/lib/server/page";
import { InviteLearnerForm } from "../../AdminForms";

export const metadata: Metadata = { title: "Invite learner" };

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { ctx } = await requirePage("/admin/people/invite");
  const { cohort: cohortId } = await searchParams;
  const cohort = (await listCohorts(ctx)).find((c) => c.id === cohortId);
  if (!cohort) {
    return (
      <p className={ui.muted}>
        Choose a cohort from <a href="/admin/people">People</a> first.
      </p>
    );
  }
  return (
    <>
      <a href={`/admin/people?cohort=${cohort.id}`}>← People</a>
      <h1 className={ui.h1}>Invite a learner to {cohort.name}</h1>
      <p className={ui.muted}>
        They&apos;ll get an email with a single-use link (valid for 72 hours) to
        set up their account.
      </p>
      <InviteLearnerForm cohortId={cohort.id} />
    </>
  );
}
