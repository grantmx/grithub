import { generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatSize,
  playbackGrant,
  posterUrl,
  readMuxConfig,
  signMuxToken,
} from "@/lib/server/mux";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const config = {
  keyId: "test-key-id",
  privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
};

function decode(token: string) {
  const [h, p, sig] = token.split(".");
  return {
    header: JSON.parse(Buffer.from(h!, "base64url").toString()),
    payload: JSON.parse(Buffer.from(p!, "base64url").toString()),
    valid: verify(
      "RSA-SHA256",
      Buffer.from(`${h}.${p}`),
      publicKey,
      Buffer.from(sig!, "base64url"),
    ),
  };
}

describe("Mux signed playback", () => {
  it("signs RS256 tokens for a playback id that expire", () => {
    const now = Date.UTC(2030, 0, 1);
    const t = decode(signMuxToken(config, "PLAYBACK123", "v", 7200, {}, now));
    expect(t.valid).toBe(true);
    expect(t.header).toMatchObject({ alg: "RS256", kid: "test-key-id" });
    expect(t.payload).toMatchObject({
      sub: "PLAYBACK123",
      aud: "v",
      exp: now / 1000 + 7200,
    });
  });

  it("puts thumbnail parameters inside the signed poster token", () => {
    const url = new URL(posterUrl(config, "PLAYBACK123"));
    expect(url.host).toBe("image.mux.com");
    expect([...url.searchParams.keys()]).toEqual(["token"]);
    expect(decode(url.searchParams.get("token")!).payload).toMatchObject({
      aud: "t",
      width: 480,
    });
  });

  it("grants short-lived tokens for playback, thumbnail and storyboard", () => {
    const grant = playbackGrant(config, "PLAYBACK123");
    expect(grant.available).toBe(true);
    if (!grant.available) return;
    expect(decode(grant.tokens.playback).payload.aud).toBe("v");
    expect(decode(grant.tokens.storyboard).payload.aud).toBe("s");
  });

  it("reports media as unavailable without Mux configuration (text still works)", () => {
    expect(readMuxConfig({})).toBeNull();
    expect(playbackGrant(null, "PLAYBACK123")).toEqual({ available: false });
    expect(playbackGrant(config, null)).toEqual({ available: false });
  });

  it("accepts a base64-encoded PEM key from the environment", () => {
    const b64 = Buffer.from(config.privateKeyPem).toString("base64");
    expect(
      readMuxConfig({ MUX_SIGNING_KEY_ID: "k", MUX_SIGNING_PRIVATE_KEY: b64 })
        ?.privateKeyPem,
    ).toContain("BEGIN PRIVATE KEY");
  });

  it("formats the pre-load label", () => {
    expect(formatDuration(360)).toBe("6 min");
    expect(formatDuration(45)).toBe("45 sec");
    expect(formatSize(25_000_000)).toBe("~25 MB");
    expect(formatSize(4_000_000)).toBe("~4 MB");
    expect(formatSize(1_500_000)).toBe("~1.5 MB");
  });
});
