import type { Database } from "db";
import type { AuthConfig } from "./env";

/**
 * Explicit context for server-side auth logic. Server actions and the proxy
 * build it from the request; tests build it directly.
 */
export type ServerCtx = {
  db: Database;
  config: AuthConfig;
  /** HMAC of the client IP (never the raw IP). */
  ipHash: string | null;
  now: () => Date;
};
