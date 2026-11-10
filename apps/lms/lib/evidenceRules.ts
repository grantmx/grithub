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

const startsWith = (b: Uint8Array, sig: readonly number[], offset = 0) =>
  b.length >= offset + sig.length && sig.every((v, i) => b[offset + i] === v);
const ascii = (b: Uint8Array, from: number, to: number) =>
  String.fromCharCode(...b.subarray(from, Math.min(to, b.length)));

const ZIP = [0x50, 0x4b, 0x03, 0x04] as const;
const ZIP_EMPTY = [0x50, 0x4b, 0x05, 0x06] as const;
/** Legacy Office (Word/Excel/PowerPoint 97–2003): OLE compound file. */
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] as const;
const HEIF_BRANDS = new Set(["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1", "heif"]);

/**
 * Does the file's content match its declared type? The browser declares the
 * type, so the server checks the first bytes ("magic numbers") after upload.
 * Office Open XML files are ZIP containers; plain text must be valid UTF-8
 * with no NUL bytes (which rules out renamed binaries).
 */
export function contentMatchesType(bytes: Uint8Array, mimeType: string): boolean {
  switch (mimeType) {
    case "application/pdf":
      // The header may follow a little junk; the spec allows it within the first 1 KB.
      return ascii(bytes, 0, 1024).includes("%PDF-");
    case "image/jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP";
    case "image/heic":
    case "image/heif":
      return ascii(bytes, 4, 8) === "ftyp" && HEIF_BRANDS.has(ascii(bytes, 8, 12));
    case "application/msword":
    case "application/vnd.ms-excel":
    case "application/vnd.ms-powerpoint":
      return startsWith(bytes, OLE);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    case "application/zip":
    case "application/x-zip-compressed":
      return startsWith(bytes, ZIP) || startsWith(bytes, ZIP_EMPTY);
    case "text/plain": {
      const head = bytes.subarray(0, 64 * 1024);
      if (head.includes(0)) return false;
      try {
        // A multi-byte character may be cut at the 64 KB boundary; `stream` tolerates that.
        new TextDecoder("utf-8", { fatal: true }).decode(head, { stream: true });
        return true;
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
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
