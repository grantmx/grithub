import { del, get, head, issueSignedToken, presignUrl, put } from "@vercel/blob";

/**
 * Private evidence storage (design-gate decision 2026-11-08: Vercel Blob,
 * private access). Files are uploaded directly from the browser (client
 * uploads, never through a function) and only ever read through short-lived
 * signed URLs issued to authorised people.
 *
 * EVIDENCE_STORE selects the driver: "blob" (default when
 * BLOB_READ_WRITE_TOKEN is set), "memory" (tests), otherwise uploads are off.
 */

export type StoredObject = { pathname: string; size: number; contentType: string };

export interface EvidenceStore {
  readonly kind: "blob" | "memory" | "none";
  head(pathname: string): Promise<StoredObject | null>;
  read(pathname: string): Promise<Uint8Array | null>;
  signedGetUrl(pathname: string, ttlMs: number): Promise<string>;
  remove(pathname: string): Promise<void>;
  /** Server-side write (backups only; learner and staff files upload directly from the browser). */
  put(pathname: string, bytes: Uint8Array, contentType: string): Promise<StoredObject>;
}

const blobStore: EvidenceStore = {
  kind: "blob",
  async head(pathname) {
    try {
      const h = await head(pathname);
      return { pathname: h.pathname, size: h.size, contentType: h.contentType };
    } catch {
      return null;
    }
  },
  async read(pathname) {
    const r = await get(pathname, { access: "private" });
    if (!r || r.statusCode !== 200) return null;
    return new Uint8Array(await new Response(r.stream).arrayBuffer());
  },
  async signedGetUrl(pathname, ttlMs) {
    const validUntil = Date.now() + ttlMs;
    const token = await issueSignedToken({ pathname, operations: ["get"], validUntil });
    const { presignedUrl } = await presignUrl(token, { operation: "get", pathname, validUntil, access: "private" });
    return presignedUrl;
  },
  async remove(pathname) {
    await del(pathname);
  },
  async put(pathname, bytes, contentType) {
    const r = await put(pathname, Buffer.from(bytes), { access: "private", contentType, addRandomSuffix: false, allowOverwrite: false });
    return { pathname: r.pathname, size: bytes.byteLength, contentType };
  },
};

/** In-memory store for tests (and the test helper `putTestObject`). */
const memory = new Map<string, { bytes: Uint8Array; contentType: string }>();
const memoryStore: EvidenceStore = {
  kind: "memory",
  async head(pathname) {
    const o = memory.get(pathname);
    return o ? { pathname, size: o.bytes.byteLength, contentType: o.contentType } : null;
  },
  async read(pathname) {
    return memory.get(pathname)?.bytes ?? null;
  },
  async signedGetUrl(pathname, ttlMs) {
    return `https://memory.invalid/${encodeURIComponent(pathname)}?exp=${Date.now() + ttlMs}`;
  },
  async remove(pathname) {
    memory.delete(pathname);
  },
  async put(pathname, bytes, contentType) {
    memory.set(pathname, { bytes, contentType });
    return { pathname, size: bytes.byteLength, contentType };
  },
};

const noStore: EvidenceStore = {
  kind: "none",
  async head() {
    return null;
  },
  async read() {
    return null;
  },
  async signedGetUrl() {
    throw new Error("Evidence storage is not configured");
  },
  async remove() {},
  async put() {
    throw new Error("Evidence storage is not configured");
  },
};

export function evidenceStore(env: NodeJS.ProcessEnv = process.env): EvidenceStore {
  const choice = env.EVIDENCE_STORE ?? (env.BLOB_READ_WRITE_TOKEN ? "blob" : "none");
  if (choice === "memory") return memoryStore;
  if (choice === "blob" && env.BLOB_READ_WRITE_TOKEN) return blobStore;
  return noStore;
}

/** Test helper: simulate a finished direct upload. */
export function putTestObject(pathname: string, bytes: Uint8Array, contentType: string) {
  memory.set(pathname, { bytes, contentType });
}

/** Signed links last 5 minutes (decision 2026-11-08). */
export const SIGNED_URL_TTL_MS = 5 * 60 * 1000;
