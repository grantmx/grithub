import type { Metadata } from "next";
import ui from "@/components/ui.module.css";
import { listCohorts } from "@/lib/server/onboarding";
import { requirePage } from "@/lib/server/page";
import { ImportLearners } from "../../AdminForms";

export const metadata: Metadata = { title: "Import learners" };

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { ctx } = await requirePage("/admin/people/import");
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
      <h1 className={ui.h1}>Import learners into {cohort.name}</h1>
      <ImportLearners cohortId={cohort.id} cohortName={cohort.name} />
    </>
  );
}
