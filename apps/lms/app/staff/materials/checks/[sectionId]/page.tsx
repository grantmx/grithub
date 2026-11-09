import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuestionVersions } from "@/components/assess/QuestionVersions";
import ui from "@/components/ui.module.css";
import { AssessmentError } from "@/lib/server/assessments";
import { getSectionCheckMaterials } from "@/lib/server/materials";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Section check" };

/** Moderator, read-only: the pool a section's check question is drawn from. */
export default async function SectionCheckMaterialsPage({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  const { ctx, actor } = await requirePage(`/staff/materials/checks/${sectionId}`);
  let c;
  try {
    c = await getSectionCheckMaterials(ctx, actor, sectionId);
  } catch (e) {
    if (e instanceof AssessmentError) notFound();
    throw e;
  }
  return (
    <div className={ui.stack}>
      <p className={ui.hint}>
        <a href="/staff/materials">Assessment materials</a> › {c.module.code} {c.module.title}
      </p>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        Section check: {c.section.title}
      </h1>
      <p className={ui.hint}>
        Each learner gets one question drawn from this pool{c.minPoolSize ? ` (minimum pool size ${c.minPoolSize})` : ""}. Formative:
        auto-graded, with the answer shown straight after.
      </p>
      <QuestionVersions questions={c.questions} />
    </div>
  );
}
