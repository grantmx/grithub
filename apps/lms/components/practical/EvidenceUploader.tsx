"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";
import { confirmUploadAction } from "@/app/(learn)/practical-actions";
import { ACCEPT_ATTRIBUTE, fileProblem, MAX_EVIDENCE_ITEMS } from "@/lib/evidenceRules";
import { Icon } from "../Icon";
import styles from "../learn/learn.module.css";

type Row = { key: string; name: string; percent: number; state: "uploading" | "done" | "error"; message?: string };

/**
 * Direct, private uploads with per-file progress (design.md L8). Files go
 * from the browser straight to storage (never through a function); large
 * files use multipart upload, which retries failed parts. Each finished
 * upload is confirmed on the server (type, size, checksum, scan) before it
 * appears in the evidence list.
 */
export function EvidenceUploader({
  submissionId,
  existing,
  enabled,
}: {
  submissionId: string;
  existing: number;
  enabled: boolean;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function send(file: File) {
    const key = `${file.name}-${file.size}-${Math.random()}`;
    const problem = fileProblem(file.name, file.type, file.size);
    setRows((rs) => [...rs, { key, name: file.name, percent: 0, state: problem ? "error" : "uploading", message: problem ?? undefined }]);
    if (problem) return;
    try {
      const blob = await upload(`evidence/${submissionId}/${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/evidence/upload",
        clientPayload: JSON.stringify({ submissionId }),
        contentType: file.type,
        multipart: file.size > 5 * 1024 * 1024,
        onUploadProgress: (e) => update(key, { percent: Math.round(e.percentage) }),
      });
      const res = await confirmUploadAction(submissionId, blob.pathname, file.name);
      if (res.ok) update(key, { state: "done", percent: 100 });
      else update(key, { state: "error", message: res.message });
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : "The upload failed. Check your connection and try again.";
      update(key, { state: "error", message: msg });
    }
  }

  async function onPick(files: FileList | null) {
    if (!files) return;
    const room = MAX_EVIDENCE_ITEMS - existing - rows.filter((r) => r.state !== "error").length;
    const list = [...files].slice(0, Math.max(0, room));
    await Promise.all(list.map(send));
    if (input.current) input.current.value = "";
    // Show the confirmed list from the server.
    if (list.length) window.location.reload();
  }

  if (!enabled) {
    return <p className={styles.hint}>{/* TODO(copy) */}File uploads aren&apos;t available right now. You can still add links.</p>;
  }
  return (
    <div className={styles.stack}>
      <label className={styles.secondary}>
        <Icon name="upload" /> Add files
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className={styles.srOnly}
          onChange={(e) => void onPick(e.currentTarget.files)}
          disabled={existing >= MAX_EVIDENCE_ITEMS}
        />
      </label>
      <noscript>
        <p className={styles.hint}>Uploading files needs JavaScript. You can still add links.</p>
      </noscript>
      {rows.length ? (
        <ul className={styles.list} aria-live="polite">
          {rows.map((r) => (
            <li key={r.key} className={styles.listItem}>
              <span>{r.name}</span>
              {r.state === "uploading" ? (
                <span className={styles.hint}>
                  <progress max={100} value={r.percent} aria-label={`Uploading ${r.name}`} /> {r.percent}%
                </span>
              ) : r.state === "done" ? (
                <span className={styles.statusDone}>✓ Uploaded</span>
              ) : (
                <span className={styles.saveBad}>{r.message}</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
