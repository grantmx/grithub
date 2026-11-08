/**
 * Practical evidence rules (design-gate decisions 2026-11-08). Pure, so the
 * browser (helpful messages) and the server (enforcement) use the same rules.
 */

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_EVIDENCE_ITEMS = 10;

/** Allowed file types: PDF, images, Office documents, text and ZIP. Video goes by link. */
export const ALLOWED_TYPES: Record<string, readonly string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/heic": ["heic"],
  "image/heif": ["heif"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/vnd.ms-powerpoint": ["ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "text/plain": ["txt"],
  "application/zip": ["zip"],
  "application/x-zip-compressed": ["zip"],
};

export const ACCEPT_ATTRIBUTE = Object.entries(ALLOWED_TYPES)
  .flatMap(([mime, exts]) => [mime, ...exts.map((e) => `.${e}`)])
  .join(",");

/** Images the evidence viewer may show inline. */
export const INLINE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function fileProblem(name: string, mimeType: string, size: number): string | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const exts = ALLOWED_TYPES[mimeType];
  if (!exts || !exts.includes(ext)) {
    return "That file type isn't accepted. Use PDF, images, Word, Excel, PowerPoint, TXT or ZIP. Share videos as a link.";
  }
  if (size <= 0) return "That file is empty.";
  if (size > MAX_FILE_BYTES) return "That file is bigger than 20 MB.";
  return null;
}

/**
 * Link allow-list (decision 2026-11-08). An entry matches the host exactly or
 * any subdomain of it. Editable by admins later; for now, change it here.
 */
export const LINK_HOSTS: readonly { host: string; label: string }[] = [
  { host: "youtube.com", label: "YouTube" },
  { host: "youtu.be", label: "YouTube" },
  { host: "vimeo.com", label: "Vimeo" },
  { host: "drive.google.com", label: "Google Drive" },
  { host: "docs.google.com", label: "Google Docs" },
  { host: "onedrive.live.com", label: "OneDrive" },
  { host: "1drv.ms", label: "OneDrive" },
  { host: "sharepoint.com", label: "OneDrive / SharePoint" },
  { host: "dropbox.com", label: "Dropbox" },
  { host: "github.com", label: "GitHub" },
  { host: "gitlab.com", label: "GitLab" },
  { host: "bitbucket.org", label: "Bitbucket" },
  { host: "figma.com", label: "Figma" },
  { host: "canva.com", label: "Canva" },
  { host: "codepen.io", label: "CodePen" },
  { host: "replit.com", label: "Replit" },
];

export const LINK_HOST_SUMMARY = [...new Set(LINK_HOSTS.map((h) => h.label))].join(", ");

export type LinkCheck = { ok: true; url: string; host: string; label: string } | { ok: false; problem: string };

export function checkLink(raw: string): LinkCheck {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return { ok: false, problem: "That isn't a web address. Paste the full link, starting with https://" };
  }
  if (u.protocol !== "https:") return { ok: false, problem: "Links must start with https://" };
  if (u.username || u.password) return { ok: false, problem: "Links can't contain a username or password." };
  if (u.toString().length > 2000) return { ok: false, problem: "That link is too long." };
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  const match = LINK_HOSTS.find((h) => host === h.host || host.endsWith(`.${h.host}`));
  if (!match) return { ok: false, problem: `Links can be from: ${LINK_HOST_SUMMARY}.` };
  return { ok: true, url: u.toString(), host, label: match.label };
}

/** A safe display name for an uploaded file (no paths or control characters). */
export function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 120);
  return cleaned || "file";
}
