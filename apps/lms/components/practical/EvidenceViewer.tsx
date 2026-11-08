import { INLINE_IMAGE_TYPES } from "@/lib/evidenceRules";
import type { PracticalReplay } from "@/lib/server/practicalMarking";
import styles from "../assess/staff.module.css";

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });
const size = (n: number | null) => (n === null ? "" : n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

const SCAN = {
  not_scanned: "Not scanned (no scanner configured)",
  pending: "Waiting for the virus check",
  clean: "✓ Virus check passed",
  infected: "✗ Failed the virus check",
} as const;

/**
 * Evidence panel (design.md S5): images inline, other files open in a new
 * tab, links with the time they were added. Every open goes through
 * /evidence/:id (5-minute signed link; staff views audited).
 */
export function EvidenceViewer({ evidence }: { evidence: PracticalReplay["evidence"] }) {
  if (evidence.length === 0) return <p>No evidence attached.</p>;
  return (
    <ul className={styles.paper} aria-label="Evidence">
      {evidence.map((e) => (
        <li key={e.id} className={styles.item}>
          <div className={styles.itemBody} style={{ paddingTop: "var(--space-2)" }}>
            {e.kind === "link" ? (
              <>
                <p className={styles.stem}>
                  🔗{" "}
                  <a href={`/evidence/${e.id}`} target="_blank" rel="noopener noreferrer">
                    {e.linkUrl}
                  </a>
                </p>
                <p>
                  {e.linkHost} · added {dateFmt.format(e.createdAt)}
                  {e.source === "assessor" ? " by the assessor" : ""}. Links can change after submission.
                </p>
              </>
            ) : (
              <>
                <p className={styles.stem}>
                  {e.fileName}{" "}
                  <span className={styles.tag}>
                    {size(e.sizeBytes)} · {e.mimeType}
                  </span>
                </p>
                {e.openable && e.mimeType && INLINE_IMAGE_TYPES.has(e.mimeType) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- private evidence via a signed redirect
                  <img src={`/evidence/${e.id}`} alt={`Evidence: ${e.fileName}`} loading="lazy" style={{ maxWidth: "100%", height: "auto", borderRadius: 4 }} />
                ) : null}
                <p>
                  {e.openable ? (
                    <a href={`/evidence/${e.id}`} target="_blank" rel="noopener noreferrer">
                      Open ↗
                    </a>
                  ) : (
                    "Can't be opened yet"
                  )}{" "}
                  · {SCAN[e.scanStatus]} · added {dateFmt.format(e.createdAt)}
                  {e.source === "assessor" ? " by the assessor" : ""}
                </p>
                <p style={{ fontSize: "var(--text-xs)", wordBreak: "break-all" }}>SHA-256 {e.checksumSha256}</p>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
