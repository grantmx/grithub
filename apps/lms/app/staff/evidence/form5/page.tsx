import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SAST, StatusBanner } from "@/components/comms/staff/Shared";
import { BackupsSection, ManualStillNeeded, PackForm, QualificationPicker, ReadinessView, SummaryBar } from "@/components/form5/ReadinessView";
import styles from "@/components/form5/form5.module.css";
import ui from "@/components/ui.module.css";
import { backupLog } from "@/lib/server/backup";
import { CommsError } from "@/lib/server/comms";
import { packSamples } from "@/lib/server/evidencePack";
import { requirePage } from "@/lib/server/page";
import { listQualifications, readiness } from "@/lib/server/readiness";

export const metadata: Metadata = { title: "Form 5 readiness" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeZone: SAST });

/** Evidence → Form 5 readiness: the same dashboard, read-only (external evaluators and SDP admins). */
export default async function EvidenceForm5Page({
  searchParams,
}: {
  searchParams: Promise<{ qualification?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const { ctx, actor } = await requirePage("/staff/evidence/form5");
  const quals = await listQualifications(ctx, actor);
  if (quals.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={ui.h1}>Form 5 readiness</h1>
        <p className={ui.muted}>No qualifications are loaded yet.</p>
      </div>
    );
  }
  const qualificationId = quals.find((q) => q.id === sp.qualification)?.id ?? quals[0]!.id;
  let r;
  try {
    r = await readiness(ctx, actor, qualificationId);
  } catch (e) {
    if (e instanceof CommsError && e.code === "not_found") notFound();
    throw e;
  }
  const [samples, log] = await Promise.all([packSamples(ctx, actor, { qualificationId }), backupLog(ctx, actor)]);
  const isAdmin = actor.roles.has("sdp_admin");

  // TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
  return (
    <div className={styles.page}>
      <p className={ui.hint}>
        <a href="/staff/evidence">Evidence</a> › Form 5 readiness
      </p>
      <QualificationPicker title="Form 5 readiness" qualifications={quals} selected={qualificationId} />
      <p className={ui.bannerInfo}>
        {isAdmin ? (
          <>
            Read-only view, as the external evaluator sees it. Edit references on <a href="/admin/form5">Admin → Form 5 readiness</a>.
          </>
        ) : (
          "Read-only evaluator access. Status is worked out from live LMS data each time this page opens."
        )}
      </p>
      <p className={ui.muted}>
        {r.qualification.title} ({r.qualification.code}, NQF {r.qualification.nqfLevel}) · checked {dateFmt.format(r.generatedAt)}
      </p>
      <StatusBanner error={sp.error} messages={{}} />
      <SummaryBar counts={r.counts} />
      <PackForm
        qualificationId={qualificationId}
        cohorts={samples.cohorts}
        cohortId={samples.cohort?.id ?? null}
        from={samples.from}
        to={samples.to}
        admin={isAdmin}
      />
      <ManualStillNeeded items={r.manualStillNeeded} />
      <ReadinessView readiness={r} />
      <BackupsSection item={r.items.find((i) => i.code === "4.1.6")} log={log} />
    </div>
  );
}
