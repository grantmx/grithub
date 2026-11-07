import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { users } from "db";
import { AuthPage } from "@/components/AuthPage";
import { PasskeyRegister } from "@/components/PasskeyRegister";
import ui from "@/components/ui.module.css";
import { needsPasskey } from "@/lib/access";
import { CURRENT_NOTICE } from "@/lib/popia";
import { requirePage } from "@/lib/server/page";
import { ConsentForm, DetailsForm } from "./SetupForms";

export const metadata: Metadata = { title: "Set up your account" };

function Steps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className={ui.steps}>
      <p className={ui.hint}>Step {step} of 3</p>
      <div className={ui.stepTrack} aria-hidden="true">
        <div
          className={ui.stepFill}
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>
    </div>
  );
}

/**
 * First-time setup (design-gate decision: one step per screen, "Step x of 3").
 * 1 confirm details → 2 POPIA notice and consent → 3 register a passkey.
 * Also used when the notice version changes (re-consent).
 */
export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const { ctx, actor } = await requirePage("/setup");
  const { step } = await searchParams;
  const [user] = await ctx.db
    .select({ displayName: users.displayName, email: users.email })
    .from(users)
    .where(eq(users.id, actor.userId));
  if (!user) redirect("/signin");

  if (actor.setupComplete) {
    if (actor.activePasskeys > 0) redirect("/");
    const canSkip = !needsPasskey(actor.roles);
    return (
      <AuthPage title="Add a passkey">
        <Steps step={3} />
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

  if (step === "2") {
    return (
      <AuthPage title="Your privacy">
        <Steps step={2} />
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
        <ConsentForm version={CURRENT_NOTICE.version} />
      </AuthPage>
    );
  }

  return (
    <AuthPage title="Confirm your details">
      <Steps step={1} />
      <DetailsForm displayName={user.displayName} email={user.email} />
    </AuthPage>
  );
}
