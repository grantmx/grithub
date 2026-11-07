import { cookies, headers } from "next/headers";
import { createDb, type Database } from "db";
import type { AccessContext } from "@/lib/access";
import type { ServerCtx } from "./context";
import { hmacHex } from "./crypto";
import { readAuthConfig } from "./env";
import { loadAccessContext, sessionCookieName } from "./session";

/**
 * Next.js-bound helpers (cookies, headers). Business logic lives in the
 * other lib/server modules and takes an explicit ServerCtx.
 */

const globalForDb = globalThis as unknown as { __lmsDb?: Database };

export function getDb(): Database {
  if (!globalForDb.__lmsDb) globalForDb.__lmsDb = createDb().db;
  return globalForDb.__lmsDb;
}

export function clientIp(h: Headers): string | null {
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || null;
}

export async function getServerCtx(): Promise<ServerCtx> {
  // Touch request headers first: this marks the route as dynamic (never
  // prerendered), so config is only read at request time.
  const h = await headers();
  const config = readAuthConfig();
  const ip = clientIp(h);
  return {
    db: getDb(),
    config,
    ipHash: ip ? hmacHex(config.sessionSecret, ip) : null,
    now: () => new Date(),
  };
}

export async function getActor(ctx?: ServerCtx): Promise<AccessContext | null> {
  const c = ctx ?? (await getServerCtx());
  const jar = await cookies();
  return loadAccessContext(
    c,
    jar.get(sessionCookieName(c.config.secureCookies))?.value,
  );
}

export async function setSessionCookie(
  ctx: ServerCtx,
  token: string,
  expiresAt: Date,
) {
  (await cookies()).set(sessionCookieName(ctx.config.secureCookies), token, {
    httpOnly: true,
    secure: ctx.config.secureCookies,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(ctx: ServerCtx) {
  (await cookies()).delete(sessionCookieName(ctx.config.secureCookies));
}

const CHALLENGE_COOKIE = "lms_webauthn";

export async function setChallengeCookie(ctx: ServerCtx, challengeId: string) {
  (await cookies()).set(CHALLENGE_COOKIE, challengeId, {
    httpOnly: true,
    secure: ctx.config.secureCookies,
    sameSite: "strict",
    path: "/",
    maxAge: 5 * 60,
  });
}

export async function takeChallengeCookie(): Promise<string | undefined> {
  const jar = await cookies();
  const value = jar.get(CHALLENGE_COOKIE)?.value;
  jar.delete(CHALLENGE_COOKIE);
  return value;
}
