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

/** Vercel Blob driver. `token` selects the store; omitted = BLOB_READ_WRITE_TOKEN (evidence). */
function makeBlobStore(token?: string): EvidenceStore {
  const auth = token ? { token } : {};
  return {
    kind: "blob",
    async head(pathname) {
      try {
        const h = await head(pathname, auth);
        return { pathname: h.pathname, size: h.size, contentType: h.contentType };
      } catch {
        return null;
      }
    },
    async read(pathname) {
      const r = await get(pathname, { access: "private", ...auth });
      if (!r || r.statusCode !== 200) return null;
      return new Uint8Array(await new Response(r.stream).arrayBuffer());
    },
    async signedGetUrl(pathname, ttlMs) {
      if (token) throw new Error("Signed links are only issued for the evidence store.");
      const validUntil = Date.now() + ttlMs;
      const signed = await issueSignedToken({ pathname, operations: ["get"], validUntil });
      const { presignedUrl } = await presignUrl(signed, { operation: "get", pathname, validUntil, access: "private" });
      return presignedUrl;
    },
    async remove(pathname) {
      await del(pathname, auth);
    },
    async put(pathname, bytes, contentType) {
      const r = await put(pathname, Buffer.from(bytes), {
        access: "private",
        contentType,
        addRandomSuffix: false,
        allowOverwrite: false,
        ...auth,
      });
      return { pathname: r.pathname, size: bytes.byteLength, contentType };
    },
  };
}

const blobStore = makeBlobStore();

/** In-memory stores for tests (and the test helper `putTestObject`). */
type MemoryMap = Map<string, { bytes: Uint8Array; contentType: string }>;
function makeMemoryStore(memory: MemoryMap): EvidenceStore {
  return {
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
}
const memory: MemoryMap = new Map();
const memoryStore = makeMemoryStore(memory);
const backupMemoryStore = makeMemoryStore(new Map());

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

/** The store id inside a Vercel Blob token (`vercel_blob_rw_<storeId>_<secret>`), when it has one. */
export function blobStoreId(token: string): string | null {
  const m = /^vercel_blob_rw_([A-Za-z0-9]+)_/.exec(token);
  return m ? m[1]! : null;
}

/**
 * Backups live in their OWN private Blob store (BACKUP_BLOB_READ_WRITE_TOKEN),
 * never in the evidence store: losing or compromising one store must not take
 * the other with it. Create it in the Vercel dashboard as a separate private
 * store (ideally in a different region from the database). There is no
 * fallback to the evidence store; without it the nightly run logs a failure.
 * BACKUP_STORE=memory is for tests.
 */
export function backupStore(env: Record<string, string | undefined> = process.env): { store: EvidenceStore; problem: string | null } {
  if (env.BACKUP_STORE === "memory") return { store: backupMemoryStore, problem: null };
  const token = env.BACKUP_BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return { store: noStore, problem: "BACKUP_BLOB_READ_WRITE_TOKEN is not set (backups need their own private store)." };
  }
  const evidence = env.BLOB_READ_WRITE_TOKEN;
  if (evidence && (token === evidence || (blobStoreId(token) !== null && blobStoreId(token) === blobStoreId(evidence)))) {
    return { store: noStore, problem: "BACKUP_BLOB_READ_WRITE_TOKEN points at the evidence store; use a separate store." };
  }
  return { store: makeBlobStore(token), problem: null };
}

/** Test helper: simulate a finished direct upload. */
export function putTestObject(pathname: string, bytes: Uint8Array, contentType: string) {
  memory.set(pathname, { bytes, contentType });
}

/** Signed links last 5 minutes (decision 2026-11-08). */
export const SIGNED_URL_TTL_MS = 5 * 60 * 1000;
