"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { confirmGuideAction } from "@/app/admin/form5-actions";
import ui from "@/components/ui.module.css";
import styles from "./form5.module.css";

/**
 * Learner guide upload (design.md §14, 2026-11-09): direct, private upload
 * of one PDF from the browser to storage, then a server confirmation that
 * checks the type, size and PDF header, records the checksum and makes it
 * the qualification's current guide.
 */

// Must match guidePrefix() in lib/server/complianceDocs.ts (server-only).
const prefix = (qualificationId: string) => `guides/${qualificationId}/`;
const MAX_BYTES = 50 * 1024 * 1024;

export function GuideUploader({ qualificationId, replacing }: { qualificationId: string; replacing: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("");
  const [issuedOn, setIssuedOn] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<{ kind: "idle" | "uploading" | "done" | "error"; text?: string }>({ kind: "idle" });

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setState({ kind: "error", text: "Choose the learner guide PDF." });
    if (!title.trim() || !version.trim() || !issuedOn) return setState({ kind: "error", text: "Fill in the title, version and issue date." });
    if (file.type !== "application/pdf") return setState({ kind: "error", text: "The learner guide must be a PDF." });
    if (file.size > MAX_BYTES) return setState({ kind: "error", text: "The learner guide can be up to 50 MB." });
    setState({ kind: "uploading", text: "Uploading… 0%" });
    try {
      const blob = await upload(`${prefix(qualificationId)}${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/compliance/guide-upload",
        clientPayload: JSON.stringify({ qualificationId }),
        contentType: "application/pdf",
        multipart: file.size > 5 * 1024 * 1024,
        onUploadProgress: (p) => setState({ kind: "uploading", text: `Uploading… ${Math.round(p.percentage)}%` }),
      });
      setState({ kind: "uploading", text: "Checking the file…" });
      const res = await confirmGuideAction(qualificationId, blob.pathname, title, version, issuedOn);
      if (!res.ok) return setState({ kind: "error", text: res.message });
      setState({ kind: "done", text: "Learner guide saved." });
      router.refresh();
    } catch (err) {
      setState({ kind: "error", text: err instanceof Error && err.message ? err.message : "The upload failed. Check your connection and try again." });
    }
  }

  // TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
  return (
    <form onSubmit={send} className={styles.form}>
      <label>
        Title
        <input className={ui.input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
      </label>
      <div className={styles.inline}>
        <label>
          Version
          <input className={ui.input} value={version} onChange={(e) => setVersion(e.target.value)} maxLength={40} required />
        </label>
        <label>
          Issued on
          <input className={ui.input} type="date" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} required />
        </label>
      </div>
      <label>
        PDF (up to 50 MB)
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
      </label>
      <div className={styles.inline}>
        <button type="submit" className={ui.button} disabled={state.kind === "uploading"}>
          {replacing ? "Replace learner guide" : "Upload learner guide"}
        </button>
        <span role="status" aria-live="polite" className={state.kind === "error" ? styles.bad : styles.muted}>
          {state.text}
        </span>
      </div>
    </form>
  );
}
