import type { Metadata } from "next";
import { ProgrammeCard } from "@/components/learn/ProgrammeCard";
import styles from "@/components/learn/learn.module.css";
import { listProgrammes } from "@/lib/server/learning";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Learn" };

export default async function LearnPage() {
  const { ctx, actor } = await requirePage("/learn");
  const programmes = await listProgrammes(ctx, actor);
  return (
    <div className={styles.stack}>
      <h1 className={styles.pageTitle}>Your programmes</h1>
      {programmes.length === 0 ? (
        <p className={styles.muted}>
          You&apos;re not enrolled in a programme yet.
        </p>
      ) : (
        <div className={styles.grid}>
          {programmes.map((p) => (
            <ProgrammeCard key={p.enrolmentId} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
