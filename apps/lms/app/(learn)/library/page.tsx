import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import styles from "@/components/learn/learn.module.css";
import { listLibrary } from "@/lib/server/learning";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Library" };

/** Digital library (Form 5 4.2.7): supplementary resources per programme. */
export default async function LibraryPage() {
  const { ctx, actor } = await requirePage("/library");
  const programmes = await listLibrary(ctx, actor);
  return (
    <div className={styles.stack}>
      <h1 className={styles.pageTitle}>Library</h1>
      <p className={styles.muted}>
        Extra reading and resources for your programmes. Optional, but useful.
      </p>
      {programmes.length === 0 ? (
        <p className={styles.muted}>Nothing here yet.</p>
      ) : null}
      {programmes.map((p) => (
        <section
          key={p.id}
          className={styles.card}
          aria-labelledby={`lib-${p.id}`}
        >
          <h2 id={`lib-${p.id}`} className={styles.cardTitle}>
            {p.title}
          </h2>
          {p.resources.length === 0 ? (
            <p className={styles.muted}>No resources yet.</p>
          ) : (
            <ul className={styles.list}>
              {p.resources.map((r) => (
                <li key={r.id} className={styles.listItem}>
                  <Icon name={r.kind === "link" ? "link" : "document"} />
                  <span>
                    {r.url ? (
                      <a
                        href={r.url}
                        className={styles.textLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {r.title}
                        <span className={styles.srOnly}>
                          {" "}
                          (opens in a new tab)
                        </span>
                      </a>
                    ) : (
                      r.title
                    )}
                    {r.description ? (
                      <span className={styles.muted}> · {r.description}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
