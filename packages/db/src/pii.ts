import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";

// Application-level encryption for sensitive personal information
// (learner_qcto_profiles.*_enc). See docs/lms/decisions.md ADR-013.
//
// - AES-256-GCM. The key never reaches Postgres, logs or backups.
// - Every value is bound to its table, column and row id through GCM's
//   additional authenticated data, so a ciphertext copied to another row or
//   column fails to decrypt.
// - Keys are versioned for rotation: each blob names the key that sealed it.
// - Blind indexes (keyed HMAC-SHA-256 of a normalised value) support "is this
//   ID number already registered?" without decrypting every row. They are not
//   reversible without PII_BLIND_INDEX_KEY.
//
// Blob layout: [format=1][key version][12-byte IV][16-byte tag][ciphertext]

const FORMAT = 1;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = 2 + IV_BYTES + TAG_BYTES;
const KEY_BYTES = 32;

export type PiiKeyring = {
  /** Version used for new encryptions (the highest configured). */
  currentVersion: number;
  keys: ReadonlyMap<number, Buffer>;
  blindIndexKey: Buffer;
};

export class PiiConfigError extends Error {}
export class PiiDecryptError extends Error {}

function decodeKey(value: string, what: string): Buffer {
  const key = Buffer.from(value.trim(), "base64");
  if (key.length !== KEY_BYTES) {
    throw new PiiConfigError(`${what} must be ${KEY_BYTES} bytes, base64-encoded`);
  }
  return key;
}

/**
 * Read keys from the environment:
 * - PII_ENCRYPTION_KEYS: comma-separated `version:base64key` pairs, versions
 *   1–255, e.g. `1:<old>,2:<new>`. The highest version encrypts; all decrypt.
 * - PII_BLIND_INDEX_KEY: base64 32-byte HMAC key. Changing it orphans every
 *   blind index, so it is not rotated with the encryption keys.
 */
export function readPiiKeyring(
  env: Record<string, string | undefined> = process.env,
): PiiKeyring {
  const rawKeys = env.PII_ENCRYPTION_KEYS?.trim();
  const rawIndex = env.PII_BLIND_INDEX_KEY?.trim();
  if (!rawKeys) throw new PiiConfigError("PII_ENCRYPTION_KEYS is not set");
  if (!rawIndex) throw new PiiConfigError("PII_BLIND_INDEX_KEY is not set");

  const keys = new Map<number, Buffer>();
  for (const part of rawKeys.split(",")) {
    const sep = part.indexOf(":");
    const version = Number(part.slice(0, sep).trim());
    if (sep < 1 || !Number.isInteger(version) || version < 1 || version > 255) {
      throw new PiiConfigError(
        "PII_ENCRYPTION_KEYS entries must look like <version 1-255>:<base64 key>",
      );
    }
    if (keys.has(version)) {
      throw new PiiConfigError(`PII_ENCRYPTION_KEYS repeats version ${version}`);
    }
    keys.set(version, decodeKey(part.slice(sep + 1), `PII key version ${version}`));
  }
  return {
    currentVersion: Math.max(...keys.keys()),
    keys,
    blindIndexKey: decodeKey(rawIndex, "PII_BLIND_INDEX_KEY"),
  };
}

/** Where a value lives. Bound into the ciphertext as AAD. */
export type PiiContext = { table: string; column: string; rowId: string };

const aad = (c: PiiContext) => Buffer.from(`${c.table}.${c.column}:${c.rowId}`, "utf8");

export function encryptPii(
  keyring: PiiKeyring,
  plaintext: string,
  context: PiiContext,
): Uint8Array {
  const key = keyring.keys.get(keyring.currentVersion);
  if (!key) throw new PiiConfigError("current PII key is missing");
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad(context));
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([
    Buffer.from([FORMAT, keyring.currentVersion]),
    iv,
    cipher.getAuthTag(),
    body,
  ]);
}

export function decryptPii(
  keyring: PiiKeyring,
  blob: Uint8Array,
  context: PiiContext,
): string {
  const buf = Buffer.from(blob);
  if (buf.length < HEADER_BYTES || buf[0] !== FORMAT) {
    throw new PiiDecryptError("not a PII ciphertext");
  }
  const version = buf[1] as number;
  const key = keyring.keys.get(version);
  if (!key) throw new PiiDecryptError(`PII key version ${version} is not configured`);
  const iv = buf.subarray(2, 2 + IV_BYTES);
  const tag = buf.subarray(2 + IV_BYTES, HEADER_BYTES);
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(aad(context));
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(buf.subarray(HEADER_BYTES)),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Never echo the ciphertext or context: the message may reach logs.
    throw new PiiDecryptError("PII value failed authentication");
  }
}

/** Key version that sealed a blob (to find rows that still need re-encryption). */
export function piiKeyVersion(blob: Uint8Array): number {
  if (blob.length < HEADER_BYTES || blob[0] !== FORMAT) {
    throw new PiiDecryptError("not a PII ciphertext");
  }
  return blob[1] as number;
}

/** Identity numbers compare without spaces, hyphens or case. */
export function normaliseIdNumber(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Blind index for an identity number. `kind` keeps the national and alternate
 * ID spaces apart. Per the spec, an alternate ID is only unique together with
 * the learner's last name, so pass `scope` = last name for alternate IDs.
 */
export function piiBlindIndex(
  keyring: PiiKeyring,
  kind: "national_id" | "alternate_id",
  value: string,
  scope = "",
): string {
  return createHmac("sha256", keyring.blindIndexKey)
    .update(`${kind}\u0000${normaliseIdNumber(value)}\u0000${scope.trim().toUpperCase()}`)
    .digest("hex");
}

/** A random 32-byte key, base64-encoded (local setup and tests). */
export function generatePiiKey(): string {
  return randomBytes(KEY_BYTES).toString("base64");
}
