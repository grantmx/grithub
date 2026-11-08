import { Markdown } from "@/lib/markdown";
import type { SectionMedia } from "@/lib/server/learning";
import { formatDuration, formatSize } from "@/lib/server/mux";
import { MediaBlock } from "./MediaBlock";
import styles from "./learn.module.css";

/**
 * Section content: optional featured media first (each with its transcript),
 * then the text, which is the lesson. With no media the page is just text.
 */
export function SectionBody({
  media,
  texts,
  posterUrls = {},
}: {
  media: SectionMedia[];
  texts: { id: string; body: string }[];
  posterUrls?: Record<string, string | null>;
}) {
  return (
    <>
      {media.map((m) => (
        <div key={m.id}>
          <MediaBlock
            contentItemId={m.id}
            kind={m.kind}
            title={m.title}
            durationLabel={formatDuration(m.durationSeconds)}
            sizeLabel={formatSize(m.sizeBytes)}
            posterUrl={posterUrls[m.id] ?? null}
            captionsLanguage={m.captionsLanguage}
          />
          {m.transcriptIsSectionText ? (
            <p
              className={styles.hint}
              style={{
                maxWidth: "var(--measure-reading)",
                marginTop: "var(--space-2)",
              }}
            >
              Transcript: the text on this page is the transcript for this{" "}
              {m.kind === "video" ? "video" : "audio"}.
            </p>
          ) : m.transcript ? (
            <details className={styles.transcript}>
              <summary>Transcript{m.title ? `: ${m.title}` : ""}</summary>
              <div className={styles.transcriptBody}>{m.transcript}</div>
            </details>
          ) : null}
        </div>
      ))}
      {texts.map((t) => (
        <Markdown key={t.id} source={t.body} />
      ))}
    </>
  );
}
