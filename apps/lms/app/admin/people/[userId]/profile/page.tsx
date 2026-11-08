import type { Metadata } from "next";
import ui from "@/components/ui.module.css";
import { requirePage } from "@/lib/server/page";
import {
  ProfileError,
  areaById,
  loadCodeLists,
  readProfileAsAdmin,
} from "@/lib/server/qctoProfile";
import { AdminProfileForm } from "./AdminProfileForm";

export const metadata: Metadata = { title: "QCTO profile" };

const dateFmt = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** SDP admin: fill in (e.g. from a paper enrolment form) or correct a learner's QCTO profile. */
export default async function AdminProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { userId } = await params;
  const { cohort } = await searchParams;
  const { ctx, actor } = await requirePage(`/admin/people/${userId}/profile`);
  const back = (
    <a
      href={`/admin/people${cohort ? `?cohort=${encodeURIComponent(cohort)}` : ""}`}
    >
      ← People
    </a>
  );
  let profile;
  try {
    profile = await readProfileAsAdmin(ctx, actor, userId);
  } catch (e) {
    if (e instanceof ProfileError)
      return (
        <>
          {back}
          <p className={ui.muted}>{e.message}</p>
        </>
      );
    throw e;
  }
  const [lists, area] = await Promise.all([
    loadCodeLists(ctx),
    areaById(ctx, profile.values.statssaAreaCode),
  ]);
  return (
    <>
      {back}
      <h1 className={ui.h1}>QCTO profile: {profile.name}</h1>
      <p className={ui.muted}>
        {profile.confirmedAt
          ? `Confirmed by the learner on ${dateFmt.format(profile.confirmedAt)}.`
          : profile.exists
            ? "In progress: the learner hasn't confirmed these details yet."
            : "Not started."}{" "}
        Changes are recorded in the audit log (which fields changed, never the
        values). The learner&apos;s confirmation stays as it is.
      </p>
      <AdminProfileForm
        userId={userId}
        values={profile.values}
        lists={lists}
        initialArea={area ? { code: area.code, label: area.label } : null}
        email={profile.email}
      />
    </>
  );
}
