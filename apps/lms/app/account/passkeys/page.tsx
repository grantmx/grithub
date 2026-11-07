import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPage } from "@/components/AuthPage";
import { PasskeyRegister } from "@/components/PasskeyRegister";
import ui from "@/components/ui.module.css";
import { needsPasskey, safeNext } from "@/lib/access";
import { listPasskeys } from "@/lib/server/auth";
import { requirePage } from "@/lib/server/page";
import { revokePasskey, signOut } from "../actions";

export const metadata: Metadata = { title: "Passkeys" };

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" });

// TODO(copy): wording to be supplied by GRIT Hub.
export default async function PasskeysPage({
  searchParams,
}: {
  searchParams: Promise<{
    required?: string;
    prompt?: string;
    next?: string;
    error?: string;
    revoked?: string;
  }>;
}) {
  const { ctx, actor } = await requirePage("/account/passkeys");
  const sp = await searchParams;
  const passkeys = await listPasskeys(ctx, actor.userId);
  const next = safeNext(sp.next, "/");
  if (sp.required && passkeys.length > 0) redirect(next);

  return (
    <AuthPage title="Your passkeys">
      {sp.required ? (
        <p role="alert" className={ui.bannerInfo}>
          This area is for marking, moderation or administration, which need a
          passkey on your account. Add one to continue.
        </p>
      ) : null}
      {sp.prompt === "1" ? (
        <p className={ui.bannerInfo}>
          You&apos;re signed in. Add a passkey so next time you can sign in with
          your fingerprint, face or screen lock.
        </p>
      ) : null}
      {sp.prompt === "recovery" ? (
        <p className={ui.bannerInfo}>
          Your account has been recovered and your old passkeys were removed.
          Add a passkey on this device now.
        </p>
      ) : null}
      {sp.error === "last_passkey" ? (
        <p role="alert" className={ui.bannerError}>
          Your role needs at least one passkey. Add another passkey before
          removing this one.
        </p>
      ) : null}
      {sp.revoked ? (
        <p className={ui.bannerSuccess}>
          Passkey removed. It can no longer be used to sign in.
        </p>
      ) : null}

      {passkeys.length > 0 ? (
        <ul
          className={ui.stack}
          style={{ listStyle: "none", padding: 0, margin: 0 }}
        >
          {passkeys.map((p) => (
            <li key={p.id} className={ui.banner}>
              <div className={ui.spread}>
                <div>
                  <strong>{p.deviceLabel}</strong>
                  <p className={ui.hint}>
                    Added {dateFmt.format(p.createdAt)}
                    {p.lastUsedAt
                      ? ` · last used ${dateFmt.format(p.lastUsedAt)}`
                      : " · not used yet"}
                  </p>
                </div>
                <form action={revokePasskey}>
                  <input type="hidden" name="passkeyId" value={p.id} />
                  <button
                    type="submit"
                    className={ui.textButton}
                    aria-label={`Remove passkey ${p.deviceLabel}`}
                  >
                    Remove
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={ui.muted}>You don&apos;t have a passkey yet.</p>
      )}

      <h2 className={ui.h2}>Add a passkey on this device</h2>
      <PasskeyRegister doneHref={sp.required ? next : "/account/passkeys"} />
      {needsPasskey(actor.roles) ? (
        <p className={ui.hint}>
          Tip: add a passkey on two devices (for example your phone and laptop).
        </p>
      ) : null}

      <div className={ui.row}>
        <a href="/" className={ui.secondary}>
          Done
        </a>
        <form action={signOut}>
          <button type="submit" className={ui.textButton}>
            Sign out
          </button>
        </form>
      </div>
    </AuthPage>
  );
}
