import { Icon } from "@/components/Icon";
import { Markdown } from "@/lib/markdown";
import type { notesForSection } from "@/lib/server/sectionNotes";
import styles from "../learner.module.css";
import { ExternalLink } from "./ExternalLink";

type Notes = Awaited<ReturnType<typeof notesForSection>>;

const dateFmt = new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", timeZone: "Africa/Johannesburg" });

/**
 * "From your facilitator" (design.md §14, 2026-11-08): the cohort's notes and
 * recording links for this section, after the lesson text and before the
 * check. Recordings are links only and open in a new tab.
 */
export function FacilitatorNotes({ notes }: { notes: Notes }) {
  if (notes.length === 0) return null;
  return (
    <aside className={styles.noteCard} aria-labelledby="fac-notes">
      <h2 id="fac-notes" className={styles.noteTitle}>
        <Icon name="note" /> From your facilitator
      </h2>
      {notes.map((n) => (
        <div key={n.id} className={styles.note}>
          <p className={styles.itemMeta}>
            {n.author} · {dateFmt.format(n.createdAt)}
          </p>
          {n.body ? <Markdown source={n.body} /> : null}
          {n.recordingUrl ? (
            <ExternalLink href={n.recordingUrl}>
              <span aria-hidden="true">▸</span> Recording: {n.recordingLabel ?? "Watch"}
            </ExternalLink>
          ) : null}
        </div>
      ))}
    </aside>
  );
}
