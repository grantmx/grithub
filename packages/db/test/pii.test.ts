import { describe, expect, it } from "vitest";
import {
  decryptPii,
  encryptPii,
  generatePiiKey,
  normaliseIdNumber,
  PiiConfigError,
  PiiDecryptError,
  piiBlindIndex,
  piiKeyVersion,
  readPiiKeyring,
  type PiiContext,
} from "../src/pii";

// Synthetic values only. 0001010000000 is not a real person's ID number.
const FAKE_ID = "0001010000000";
const k1 = generatePiiKey();
const k2 = generatePiiKey();
const indexKey = generatePiiKey();
const ctx: PiiContext = {
  table: "learner_qcto_profiles",
  column: "national_id_enc",
  rowId: "00000000-0000-4000-8000-0000000000aa",
};

const ring = (keys: string) =>
  readPiiKeyring({ PII_ENCRYPTION_KEYS: keys, PII_BLIND_INDEX_KEY: indexKey });

describe("readPiiKeyring", () => {
  it("uses the highest version for new encryptions", () => {
    expect(ring(`1:${k1},2:${k2}`).currentVersion).toBe(2);
  });

  it.each([
    [{}, /PII_ENCRYPTION_KEYS is not set/],
    [{ PII_ENCRYPTION_KEYS: `1:${k1}` }, /PII_BLIND_INDEX_KEY is not set/],
    [{ PII_ENCRYPTION_KEYS: k1, PII_BLIND_INDEX_KEY: indexKey }, /version/],
    [
      { PII_ENCRYPTION_KEYS: `0:${k1}`, PII_BLIND_INDEX_KEY: indexKey },
      /version/,
    ],
    [
      { PII_ENCRYPTION_KEYS: `1:${k1},1:${k2}`, PII_BLIND_INDEX_KEY: indexKey },
      /repeats/,
    ],
    [
      { PII_ENCRYPTION_KEYS: "1:c2hvcnQ=", PII_BLIND_INDEX_KEY: indexKey },
      /32 bytes/,
    ],
    [
      { PII_ENCRYPTION_KEYS: `1:${k1}`, PII_BLIND_INDEX_KEY: "c2hvcnQ=" },
      /32 bytes/,
    ],
  ])("rejects bad config %#", (env, message) => {
    expect(() => readPiiKeyring(env)).toThrow(PiiConfigError);
    expect(() => readPiiKeyring(env)).toThrow(message);
  });
});

describe("encryptPii / decryptPii", () => {
  it("round-trips and never stores the plaintext", () => {
    const r = ring(`1:${k1}`);
    const blob = encryptPii(r, FAKE_ID, ctx);
    expect(Buffer.from(blob).includes(Buffer.from(FAKE_ID))).toBe(false);
    expect(decryptPii(r, blob, ctx)).toBe(FAKE_ID);
  });

  it("uses a fresh IV each time", () => {
    const r = ring(`1:${k1}`);
    const a = Buffer.from(encryptPii(r, FAKE_ID, ctx));
    const b = Buffer.from(encryptPii(r, FAKE_ID, ctx));
    expect(a.equals(b)).toBe(false);
  });

  it("fails if the ciphertext is moved to another row or column", () => {
    const r = ring(`1:${k1}`);
    const blob = encryptPii(r, FAKE_ID, ctx);
    expect(() =>
      decryptPii(r, blob, {
        ...ctx,
        rowId: "00000000-0000-4000-8000-0000000000bb",
      }),
    ).toThrow(PiiDecryptError);
    expect(() =>
      decryptPii(r, blob, { ...ctx, column: "alternate_id_enc" }),
    ).toThrow(PiiDecryptError);
  });

  it("fails if the ciphertext is tampered with", () => {
    const r = ring(`1:${k1}`);
    const blob = Buffer.from(encryptPii(r, FAKE_ID, ctx));
    blob[blob.length - 1] = (blob[blob.length - 1] as number) ^ 1;
    expect(() => decryptPii(r, blob, ctx)).toThrow(PiiDecryptError);
  });

  it("does not leak the value or context in error messages", () => {
    const r = ring(`1:${k1}`);
    const blob = encryptPii(r, FAKE_ID, ctx);
    try {
      decryptPii(r, blob, { ...ctx, rowId: "other" });
      expect.unreachable();
    } catch (e) {
      expect(String(e)).not.toContain(FAKE_ID);
      expect(String(e)).not.toContain(ctx.rowId);
    }
  });

  it("rejects input that is not a PII blob", () => {
    const r = ring(`1:${k1}`);
    expect(() => decryptPii(r, new Uint8Array([9, 1, 2]), ctx)).toThrow(
      PiiDecryptError,
    );
    expect(() => piiKeyVersion(new Uint8Array([2, 1]))).toThrow(
      PiiDecryptError,
    );
  });

  it("supports key rotation: old blobs still decrypt, new ones use the new key", () => {
    const old = encryptPii(ring(`1:${k1}`), FAKE_ID, ctx);
    const rotated = ring(`1:${k1},2:${k2}`);
    expect(piiKeyVersion(old)).toBe(1);
    expect(decryptPii(rotated, old, ctx)).toBe(FAKE_ID);
    const fresh = encryptPii(rotated, FAKE_ID, ctx);
    expect(piiKeyVersion(fresh)).toBe(2);
    // A retired key that is no longer configured can't decrypt.
    expect(() => decryptPii(ring(`2:${k2}`), old, ctx)).toThrow(/version 1/);
  });
});

describe("piiBlindIndex", () => {
  it("is stable across formatting and case", () => {
    const r = ring(`1:${k1}`);
    expect(normaliseIdNumber(" ab-12 34 ")).toBe("AB1234");
    expect(piiBlindIndex(r, "alternate_id", "ab-1234", "Doe")).toBe(
      piiBlindIndex(r, "alternate_id", "AB 1234", " doe "),
    );
  });

  it("separates kinds and alternate-ID scopes, and depends on the key", () => {
    const r = ring(`1:${k1}`);
    const national = piiBlindIndex(r, "national_id", FAKE_ID);
    expect(piiBlindIndex(r, "alternate_id", FAKE_ID)).not.toBe(national);
    expect(piiBlindIndex(r, "alternate_id", "X1", "Doe")).not.toBe(
      piiBlindIndex(r, "alternate_id", "X1", "Roe"),
    );
    const other = readPiiKeyring({
      PII_ENCRYPTION_KEYS: `1:${k1}`,
      PII_BLIND_INDEX_KEY: generatePiiKey(),
    });
    expect(piiBlindIndex(other, "national_id", FAKE_ID)).not.toBe(national);
    expect(national).toMatch(/^[0-9a-f]{64}$/);
  });

  it("does not depend on the encryption key, so rotation keeps indexes valid", () => {
    expect(piiBlindIndex(ring(`1:${k1}`), "national_id", FAKE_ID)).toBe(
      piiBlindIndex(ring(`1:${k1},2:${k2}`), "national_id", FAKE_ID),
    );
  });
});
