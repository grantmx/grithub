import { ProgrammeCard } from "@/components/learn/ProgrammeCard";
import styles from "@/components/learn/learn.module.css";
import ui from "@/components/ui.module.css";
import { comingUp, firstName, listProgrammes } from "@/lib/server/learning";
import { requirePage } from "@/lib/server/page";

const dateFmt = new Intl.DateTimeFormat("en-ZA", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

function greeting(now: Date): string {
  const h = Number(
    new Intl.DateTimeFormat("en-ZA", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Africa/Johannesburg",
    }).format(now),
  );
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** Home (L4): greeting, one card per programme with status + Continue, coming up. */
export default async function HomePage() {
  const { ctx, actor } = await requirePage("/");
  const [name, programmes, upcoming] = await Promise.all([
    firstName(ctx, actor.userId),
    listProgrammes(ctx, actor),
    comingUp(ctx, actor),
  ]);

  // TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
  return (
    <div className={styles.stack}>
      <h1 className={styles.pageTitle}>
        {greeting(ctx.now())}
        {name ? `, ${name}` : ""}
      </h1>
      {actor.activePasskeys === 0 ? (
        <p className={ui.bannerInfo}>
          Sign in faster next time:{" "}
          <a href="/account/passkeys">add a passkey</a>.
        </p>
      ) : null}

      {programmes.length === 0 ? (
        <p className={styles.muted}>
          You&apos;re not enrolled in a programme yet. Your facilitator will add
          you.
        </p>
      ) : (
        <section aria-label="Your programmes" className={styles.grid}>
          {programmes.map((p) => (
            <ProgrammeCard key={p.enrolmentId} p={p} />
          ))}
        </section>
      )}

      {upcoming.assessmentDays.length > 0 || upcoming.latestAnnouncement ? (
        <section
          aria-labelledby="coming-up"
          className={styles.stack}
          style={{ gap: "var(--space-3)" }}
        >
          <h2 id="coming-up" className={styles.cardTitle}>
            Coming up
          </h2>
          <ul className={styles.list}>
            {upcoming.assessmentDays.map((d) => (
              <li key={d.id} className={styles.listItem}>
                <span>
                  <strong>Assessment day</strong> ·{" "}
                  {dateFmt.format(new Date(`${d.heldOn}T00:00:00`))} · {d.venue}
                </span>
              </li>
            ))}
            {upcoming.latestAnnouncement ? (
              <li className={styles.listItem}>
                <span>
                  <strong>Latest announcement:</strong>{" "}
                  {upcoming.latestAnnouncement.title}
                </span>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
