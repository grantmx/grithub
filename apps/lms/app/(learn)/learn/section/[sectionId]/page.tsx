import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { completeSectionAction } from "@/app/(learn)/actions";
import { Icon } from "@/components/Icon";
import { FacilitatorNotes } from "@/components/comms/learner/FacilitatorNotes";
import { CheckCard } from "@/components/learn/CheckCard";
import { Outline } from "@/components/learn/Outline";
import { ScrollMemory } from "@/components/learn/ScrollMemory";
import { SectionBody } from "@/components/learn/SectionBody";
import styles from "@/components/learn/learn.module.css";
import { LearningError, getSectionPage } from "@/lib/server/learning";
import { posterUrl, readMuxConfig } from "@/lib/server/mux";
import { requirePage } from "@/lib/server/page";
import { getCheckView } from "@/lib/server/sectionCheck";
import { notesForSection } from "@/lib/server/sectionNotes";

export const metadata: Metadata = { title: "Section" };

/**
 * Learning page (design.md L7, wireframe approved 2026-11-08): outline,
 * optional featured media, the text, one section check, Mark as completed,
 * Go to next item. Works without JavaScript; JS only adds scroll memory,
 * auto-opening the outline on wide screens, and the media player.
 */
export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string }>;
  searchParams: Promise<{
    resume?: string;
    check?: string;
    completed?: string;
  }>;
}) {
  const { sectionId } = await params;
  const sp = await searchParams;
  const { ctx, actor } = await requirePage(`/learn/section/${sectionId}`);

  let page;
  try {
    page = await getSectionPage(ctx, actor, sectionId);
  } catch (e) {
    if (e instanceof LearningError) notFound();
    throw e;
  }
  const check = page.hasCheck
    ? await getCheckView(ctx, actor, sectionId)
    : ({ state: "none" } as const);
  const notes = await notesForSection(ctx, actor, sectionId);
  const answered = check.state === "result";
  const canComplete = !page.hasCheck || check.state === "none" || answered;

  const mux = readMuxConfig();
  const posters = Object.fromEntries(
    page.media.map((m) => [
      m.id,
      m.kind === "video" && mux && m.playbackId
        ? posterUrl(mux, m.playbackId)
        : null,
    ]),
  );

  return (
    <div className={styles.sectionLayout}>
      <Outline outline={page.outline} currentSectionId={sectionId} />

      <article className={styles.content} aria-labelledby="section-title">
        <ScrollMemory
          sectionId={sectionId}
          resumePercent={sp.resume ? page.scrollPercent : null}
        />
        <p className={styles.crumb}>
          <a
            href={`/learn/${page.qualification.id}`}
            className={styles.textLink}
          >
            {page.module.title}
          </a>{" "}
          › Section {page.position.index} of {page.position.total} ·{" "}
          <a href={`/learn/discuss/${page.module.id}`} className={styles.textLink}>
            Discuss this module <span aria-hidden="true">›</span>
          </a>
        </p>
        <h1 id="section-title" className={styles.sectionTitle}>
          {page.section.title}
        </h1>

        <SectionBody
          media={page.media}
          texts={page.texts}
          posterUrls={posters}
        />

        <FacilitatorNotes notes={notes} />

        <CheckCard sectionId={sectionId} view={check} notice={sp.check} />

        <div id="complete" className={styles.completeBar}>
          {page.completedAt ? (
            <p
              className={`${styles.status} ${styles.statusDone}`}
              role={sp.completed ? "status" : undefined}
            >
              <Icon name="done" /> Section complete
            </p>
          ) : (
            <form action={completeSectionAction}>
              <input type="hidden" name="sectionId" value={sectionId} />
              <button
                type="submit"
                className={styles.secondary}
                disabled={!canComplete}
                aria-describedby={!canComplete ? "complete-hint" : undefined}
              >
                <Icon name="done" /> Mark as completed
              </button>
              {!canComplete ? (
                <p id="complete-hint" className={styles.hint}>
                  Answer the check question first.
                </p>
              ) : null}
            </form>
          )}
          {page.nextId ? (
            <a className={styles.button} href={`/learn/section/${page.nextId}`}>
              Go to next item <Icon name="next" />
            </a>
          ) : (
            <a
              className={styles.button}
              href={`/learn/${page.qualification.id}`}
            >
              Back to programme
            </a>
          )}
        </div>
      </article>
    </div>
  );
}
