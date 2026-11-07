/**
 * Auth/email configuration, read from environment variables only.
 * WEBAUTHN_RP_ID and WEBAUTHN_ORIGIN bind every passkey to the domain:
 * changing the domain makes existing passkeys unusable (see apps/lms/README.md).
 */
export type AuthConfig = {
  rpId: string;
  rpName: string;
  origin: string;
  appUrl: string;
  sessionSecret: string;
  secureCookies: boolean;
};

export type EmailTransportName = "resend" | "console" | "memory";

export type EmailConfig = {
  transport: EmailTransportName;
  apiKey?: string;
  from?: string;
};

function required(
  env: Record<string, string | undefined>,
  name: string,
): string {
  const value = env[name];
  if (!value) throw new Error(`${name} is not set. See apps/lms/.env.example.`);
  return value;
}

export function readAuthConfig(
  env: Record<string, string | undefined> = process.env,
): AuthConfig {
  const rpId = required(env, "WEBAUTHN_RP_ID");
  const origin = required(env, "WEBAUTHN_ORIGIN").replace(/\/$/, "");
  const sessionSecret = required(env, "SESSION_SECRET");
  if (sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters.");
  }
  const originHost = new URL(origin).hostname;
  if (originHost !== rpId && !originHost.endsWith(`.${rpId}`)) {
    throw new Error(
      "WEBAUTHN_ORIGIN must be on WEBAUTHN_RP_ID (or a subdomain of it).",
    );
  }
  return {
    rpId,
    rpName: env.WEBAUTHN_RP_NAME || "GRIT Hub Learning",
    origin,
    appUrl: (env.NEXT_PUBLIC_APP_URL || origin).replace(/\/$/, ""),
    sessionSecret,
    secureCookies: origin.startsWith("https://"),
  };
}

export function readEmailConfig(
  env: Record<string, string | undefined> = process.env,
): EmailConfig {
  const explicit = env.EMAIL_TRANSPORT as EmailTransportName | undefined;
  const transport: EmailTransportName =
    explicit ?? (env.NODE_ENV === "production" ? "resend" : "console");
  if (!["resend", "console", "memory"].includes(transport)) {
    throw new Error('EMAIL_TRANSPORT must be "resend", "console" or "memory".');
  }
  if (transport === "resend") {
    return {
      transport,
      apiKey: required(env, "EMAIL_PROVIDER_API_KEY"),
      from: required(env, "EMAIL_FROM_ADDRESS"),
    };
  }
  if (env.NODE_ENV === "production" && transport === "console") {
    throw new Error(
      "The console email transport is not allowed in production.",
    );
  }
  return { transport };
}
