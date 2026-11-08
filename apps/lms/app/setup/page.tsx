import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { users } from "db";
import { AuthPage } from "@/components/AuthPage";
import { PasskeyRegister } from "@/components/PasskeyRegister";
import { ProfileSummary } from "@/components/profile/ProfileSummary";
import ui from "@/components/ui.module.css";
import { needsPasskey } from "@/lib/access";
import { CURRENT_NOTICE, QCTO_SHARING_CONSENT } from "@/lib/popia";
import {
  PART_TITLES,
  PROFILE_PARTS,
  type ProfilePart,
  firstIncompletePart,
} from "@/lib/qctoProfile";
import { requirePage } from "@/lib/server/page";
import {
  areaById,
  loadCodeLists,
  readOwnProfile,
} from "@/lib/server/qctoProfile";
import { getSetupState, setupComplete } from "@/lib/server/setupState";
import {
  ConfirmProfileForm,
  ConsentForm,
  DetailsForm,
  ProfilePartForm,
} from "./SetupForms";

export const metadata: Metadata = { title: "Set up your account" };

function Steps({
  step,
  total,
  part,
}: {
  step: number;
  total: number;
  part?: ProfilePart | "review";
}) {
  const partNumber = part
    ? part === "review"
      ? PROFILE_PARTS.length + 1
      : PROFILE_PARTS.indexOf(part) + 1
    : 0;
  return (
    <div className={ui.steps}>
      <p className={ui.hint}>
        Step {step} of {total}
      </p>
      <div className={ui.stepTrack} aria-hidden="true">
        <div
          className={ui.stepFill}
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
      {part ? (
        <p className={ui.hint}>
          Your details · Part {partNumber} of {PROFILE_PARTS.length + 1}:{" "}
          {PART_TITLES[part]}
        </p>
      ) : null}
    </div>
  );
}

const PARTS_AND_REVIEW: readonly (ProfilePart | "review")[] = [
  ...PROFILE_PARTS,
  "review",
];

/**
 * First-time setup (design gate: one step per screen, "Step x of n").
 * Learners: 1 details → 2 notice + QCTO sharing consent → 3 QCTO profile
 * (About you → Contact & address → Background → Review & confirm) → 4 passkey.
 * Staff: 1 details → 2 notice → 3 passkey.
 * Also used when the notice or the QCTO consent version changes.
 */
export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; part?: string }>;
}) {
  const { ctx, actor } = await requirePage("/setup");
  const { step, part } = await searchParams;
  const [user] = await ctx.db
    .select({ displayName: users.displayName, email: users.email })
    .from(users)
    .where(eq(users.id, actor.userId));
  const state = await getSetupState(ctx, actor.userId);
  if (!user || !state) redirect("/signin");
  const total = state.isLearner ? 4 : 3;

  if (setupComplete(state)) {
    if (actor.activePasskeys > 0) redirect("/");
    const canSkip = !needsPasskey(actor.roles);
    return (
      <AuthPage title="Add a passkey">
        <Steps step={total} total={total} />
        <p className={ui.muted}>
          A passkey lets you sign in with your fingerprint, face or screen lock
          instead of waiting for an email. It stays on your device; we never see
          your fingerprint or face.
        </p>
        <PasskeyRegister doneHref="/" buttonLabel="Create passkey" />
        {canSkip ? (
          <a href="/" className={ui.textButton}>
            Skip for now (sign in with email links)
          </a>
        ) : (
          <p className={ui.hint}>
            Your role needs a passkey to open marking, moderation or admin
            screens.
          </p>
        )}
      </AuthPage>
    );
  }

  const consentsDone =
    state.status === "active" &&
    state.noticeCurrent &&
    (!state.isLearner || state.qctoConsentCurrent);

  // Step 3: the QCTO profile (learners, after both consents).
  if (consentsDone && state.isLearner && step !== "1" && step !== "2") {
    const [profile, lists] = await Promise.all([
      readOwnProfile(ctx, actor),
      loadCodeLists(ctx),
    ]);
    const area = await areaById(ctx, profile.values.statssaAreaCode);
    const areaOk = (code: string, province: string) =>
      Boolean(area && area.code === code && area.provinceCode === province);
    const firstOpen = firstIncompletePart(profile.values, lists, {
      areaInProvince: areaOk,
      today: ctx.now(),
    });
    // Parts open in order: a learner can go back, but not skip ahead.
    const requested = PARTS_AND_REVIEW.find((p) => p === part);
    const current =
      requested &&
      PARTS_AND_REVIEW.indexOf(requested) <= PARTS_AND_REVIEW.indexOf(firstOpen)
        ? requested
        : firstOpen;
    const i = PARTS_AND_REVIEW.indexOf(current);
    const backHref =
      i === 0 ? "/setup?step=2" : `/setup?part=${PARTS_AND_REVIEW[i - 1]}`;

    if (current === "review") {
      return (
        <AuthPage title="Check your details">
          <Steps step={3} total={total} part="review" />
          <p className={ui.muted}>
            The QCTO uses these details to enrol and certify you. Please check
            that they match your ID or passport exactly.
          </p>
          <ProfileSummary
            values={profile.values}
            lists={lists}
            areaLabel={area?.label ?? ""}
            email={user.email}
            maskIds={false}
            editHref={(p) => `/setup?part=${p}`}
          />
          <ConfirmProfileForm backHref={backHref} />
        </AuthPage>
      );
    }
    return (
      <AuthPage title={PART_TITLES[current]}>
        <Steps step={3} total={total} part={current} />
        {current === "about" && !profile.exists ? (
          <p className={ui.muted}>
            The QCTO needs these details to enrol you for the external
            assessment and certify you. It takes about 5 minutes. Have your ID
            or passport with you.
          </p>
        ) : null}
        <ProfilePartForm
          part={current}
          values={profile.values}
          lists={lists}
          initialArea={area ? { code: area.code, label: area.label } : null}
          email={user.email}
          backHref={backHref}
        />
      </AuthPage>
    );
  }

  if (step === "2" || (consentsDone === false && state.noticeCurrent)) {
    return (
      <AuthPage title="Your privacy">
        <Steps step={2} total={total} />
        <article
          className={ui.notice}
          aria-label={CURRENT_NOTICE.title}
          tabIndex={0}
        >
          <h2 className={ui.h2}>{CURRENT_NOTICE.title}</h2>
          {CURRENT_NOTICE.sections.map((s) => (
            <section key={s.heading}>
              <h3>{s.heading}</h3>
              {s.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </section>
          ))}
          <p className={ui.hint}>Notice version {CURRENT_NOTICE.version}</p>
        </article>
        <ConsentForm
          version={CURRENT_NOTICE.version}
          qcto={state.isLearner ? QCTO_SHARING_CONSENT : undefined}
          backHref="/setup?step=1"
        />
      </AuthPage>
    );
  }

  return (
    <AuthPage title="Confirm your details">
      <Steps step={1} total={total} />
      <DetailsForm displayName={user.displayName} email={user.email} />
    </AuthPage>
  );
}
