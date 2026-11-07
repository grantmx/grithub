import { createHash, createHmac, randomBytes } from "node:crypto";

/** 256-bit random token, base64url (for cookies and emailed links). */
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256Hex(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Keyed hash for IPs and emails used as rate-limit keys: never stored raw. */
export function hmacHex(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

/** WebAuthn user handle: the user's UUID as 16 raw bytes (no personal data). */
export function uuidToBytes(uuid: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(Buffer.from(uuid.replace(/-/g, ""), "hex"));
}

export function bytesToUuid(bytes: Uint8Array): string {
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
