import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { users } from "db";
import { AuthPage } from "@/components/AuthPage";
import { ProfileSummary } from "@/components/profile/ProfileSummary";
import ui from "@/components/ui.module.css";
import { requirePage } from "@/lib/server/page";
import {
  areaById,
  loadCodeLists,
  readOwnProfile,
} from "@/lib/server/qctoProfile";

export const metadata: Metadata = { title: "Your QCTO details" };

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" });

/**
 * The learner's QCTO details, read-only (design gate 2026-11-08: edits after
 * setup are admin only; ID/passport masked to the last 4 characters).
 */
export default async function AccountProfilePage() {
  const { ctx, actor } = await requirePage("/account/profile");
  const [user] = await ctx.db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, actor.userId));
  const [profile, lists] = await Promise.all([
    readOwnProfile(ctx, actor),
    loadCodeLists(ctx),
  ]);
  const area = await areaById(ctx, profile.values.statssaAreaCode);

  return (
    <AuthPage title="Your QCTO details">
      {profile.exists ? (
        <>
          <p className={ui.muted}>
            These are the details we send to the QCTO to enrol and certify you.
            {profile.confirmedAt
              ? ` You confirmed them on ${dateFmt.format(profile.confirmedAt)}.`
              : ""}
          </p>
          <ProfileSummary
            values={profile.values}
            lists={lists}
            areaLabel={area?.label ?? ""}
            email={user?.email ?? ""}
            maskIds
          />
          <p className={ui.hint}>
            Something wrong? Ask your facilitator or the training provider to
            correct it.
          </p>
        </>
      ) : (
        <p className={ui.muted}>
          You don&apos;t have any QCTO details. They are only collected for
          learners.
        </p>
      )}
      <a href="/more" className={ui.secondary}>
        ← More
      </a>
    </AuthPage>
  );
}
