import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuestionVersions } from "@/components/assess/QuestionVersions";
import ui from "@/components/ui.module.css";
import { AssessmentError } from "@/lib/server/assessments";
import { getBankMaterials } from "@/lib/server/materials";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Question bank" };

/** Moderator, read-only: every question in a bank with all its versions, keys and rubrics. */
export default async function BankMaterialsPage({ params }: { params: Promise<{ bankId: string }> }) {
  const { bankId } = await params;
  const { ctx, actor } = await requirePage(`/staff/materials/banks/${bankId}`);
  let b;
  try {
    b = await getBankMaterials(ctx, actor, bankId);
  } catch (e) {
    if (e instanceof AssessmentError) notFound();
    throw e;
  }
  return (
    <div className={ui.stack}>
      <p className={ui.hint}>
        <a href="/staff/materials">Assessment materials</a> › {b.module.code} {b.module.title}
      </p>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        {b.bank.curriculumComponentRef} · {b.bank.title}
      </h1>
      <p className={ui.bannerInfo} role="note">
        Read-only.
      </p>
      <QuestionVersions questions={b.questions} />
    </div>
  );
}
