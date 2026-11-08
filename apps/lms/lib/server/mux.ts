import { createPrivateKey, sign } from "node:crypto";

/**
 * Mux signed playback (architecture.md: hosted media, signed expiring URLs).
 * Tokens are RS256 JWTs signed with a Mux signing key; they are minted only
 * when the learner presses Watch/Listen, and expire quickly.
 * Config from env only: MUX_SIGNING_KEY_ID, MUX_SIGNING_PRIVATE_KEY (the
 * base64-encoded PEM Mux provides, or a raw PEM).
 */
export type MuxConfig = { keyId: string; privateKeyPem: string };

export const PLAYBACK_TTL_SECONDS = 2 * 60 * 60; // long enough to finish a video
export const POSTER_TTL_SECONDS = 60 * 60;

export function readMuxConfig(
  env: Record<string, string | undefined> = process.env,
): MuxConfig | null {
  const keyId = env.MUX_SIGNING_KEY_ID;
  const raw = env.MUX_SIGNING_PRIVATE_KEY;
  if (!keyId || !raw) return null;
  const privateKeyPem = raw.includes("-----BEGIN")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return { keyId, privateKeyPem };
}

const b64url = (v: string | Buffer) => Buffer.from(v).toString("base64url");

/**
 * aud: "v" video/audio playback, "t" thumbnail, "s" storyboard.
 * Extra claims (e.g. thumbnail width) must be inside the token for signed URLs.
 */
export function signMuxToken(
  config: MuxConfig,
  playbackId: string,
  aud: "v" | "t" | "s",
  ttlSeconds: number,
  extraClaims: Record<string, string | number> = {},
  nowMs: number = Date.now(),
): string {
  const header = { alg: "RS256", typ: "JWT", kid: config.keyId };
  const payload = {
    sub: playbackId,
    aud,
    exp: Math.floor(nowMs / 1000) + ttlSeconds,
    kid: config.keyId,
    ...extraClaims,
  };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(data),
    createPrivateKey(config.privateKeyPem),
  );
  return `${data}.${b64url(signature)}`;
}

export function posterUrl(config: MuxConfig, playbackId: string): string {
  const token = signMuxToken(config, playbackId, "t", POSTER_TTL_SECONDS, {
    width: 480,
  });
  return `https://image.mux.com/${encodeURIComponent(playbackId)}/thumbnail.webp?token=${token}`;
}

export type PlaybackGrant =
  | { available: false }
  | {
      available: true;
      playbackId: string;
      tokens: { playback: string; thumbnail: string; storyboard: string };
      expiresAt: string;
    };

export function playbackGrant(
  config: MuxConfig | null,
  playbackId: string | null,
  nowMs = Date.now(),
): PlaybackGrant {
  if (!config || !playbackId) return { available: false };
  return {
    available: true,
    playbackId,
    tokens: {
      playback: signMuxToken(
        config,
        playbackId,
        "v",
        PLAYBACK_TTL_SECONDS,
        {},
        nowMs,
      ),
      thumbnail: signMuxToken(
        config,
        playbackId,
        "t",
        PLAYBACK_TTL_SECONDS,
        {},
        nowMs,
      ),
      storyboard: signMuxToken(
        config,
        playbackId,
        "s",
        PLAYBACK_TTL_SECONDS,
        {},
        nowMs,
      ),
    },
    expiresAt: new Date(nowMs + PLAYBACK_TTL_SECONDS * 1000).toISOString(),
  };
}

/** "6 min · ~25 MB" style labels for the pre-load media block. */
export function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  return seconds < 60 ? `${seconds} sec` : `${Math.round(seconds / 60)} min`;
}

export function formatSize(bytes: number | null): string | null {
  if (!bytes) return null;
  const mb = bytes / 1_000_000;
  return mb >= 10
    ? `~${Math.round(mb)} MB`
    : `~${mb.toFixed(1).replace(/\.0$/, "")} MB`;
}
