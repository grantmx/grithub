/**
 * Database connection settings, read from environment variables only.
 * No host, region, user or password is hard-coded anywhere in this package:
 * the region is whichever host DATABASE_URL points at.
 */
export type DbConfig = {
  url: string;
  ssl: "require" | false;
  poolMax: number;
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function isLocalUrl(url: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname.replace(/^\[|\]$/g, ""));
  } catch {
    return false;
  }
}

export function readDbConfig(
  env: Record<string, string | undefined> = process.env,
  urlVar = "DATABASE_URL",
): DbConfig {
  const url = env[urlVar];
  if (!url) {
    throw new Error(`${urlVar} is not set. See packages/db/.env.example.`);
  }

  const sslSetting = env.DATABASE_SSL?.toLowerCase();
  if (sslSetting && sslSetting !== "require" && sslSetting !== "disable") {
    throw new Error('DATABASE_SSL must be "require" or "disable".');
  }
  // Default: TLS for anything that is not a local database.
  const ssl =
    sslSetting === "disable" || (!sslSetting && isLocalUrl(url))
      ? false
      : "require";

  const poolMax = env.DATABASE_POOL_MAX ? Number(env.DATABASE_POOL_MAX) : 5;
  if (!Number.isInteger(poolMax) || poolMax < 1) {
    throw new Error("DATABASE_POOL_MAX must be a positive integer.");
  }

  return { url, ssl, poolMax };
}
