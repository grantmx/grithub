import { NextResponse, type NextRequest } from "next/server";
import { decide, requirementFor } from "@/lib/access";
import { writeAudit } from "@/lib/server/audit";
import { hmacHex } from "@/lib/server/crypto";
import { readAuthConfig } from "@/lib/server/env";
import { clientIp, getDb } from "@/lib/server/request";
import { loadAccessContext, sessionCookieName } from "@/lib/server/session";

/**
 * Next.js 16 proxy (formerly "middleware"), Node.js runtime. It enforces the
 * route rules from lib/access.ts on every page request. Server actions
 * enforce the same rules again via lib/server/auth.ts `authorize`.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const requirement = requirementFor(pathname);
  if (requirement.kind === "public") return NextResponse.next();

  const config = readAuthConfig();
  const db = getDb();
  const token = request.cookies.get(
    sessionCookieName(config.secureCookies),
  )?.value;
  const actor = await loadAccessContext({ db, now: () => new Date() }, token);
  const decision = decide(requirement, actor);

  const to = (path: string) =>
    NextResponse.redirect(new URL(path, request.url));
  const next = encodeURIComponent(pathname + search);

  switch (decision.result) {
    case "allow":
      // External evaluators: every page they open is audited (roles.md). The
      // path holds ids only; query strings are left out.
      if (actor?.roles.has("external_evaluator")) {
        const ip = clientIp(request.headers);
        await writeAudit(
          { db, ipHash: ip ? hmacHex(config.sessionSecret, ip) : null },
          {
            action: "evaluator.page.viewed",
            actorId: actor.userId,
            entityType: "route",
            after: { path: pathname },
          },
        );
      }
      return NextResponse.next();
    case "signin":
      return to(`/signin?next=${next}`);
    case "setup":
      return to("/setup");
    case "forbidden":
    case "stepup": {
      const ip = clientIp(request.headers);
      await writeAudit(
        { db, ipHash: ip ? hmacHex(config.sessionSecret, ip) : null },
        {
          action: "auth.permission_denied",
          actorId: actor?.userId ?? null,
          entityType: "route",
          after: { path: pathname, result: decision.result },
        },
      );
      return decision.result === "stepup"
        ? to(`/account/passkeys?required=1&next=${next}`)
        : to("/forbidden");
    }
  }
}

export const config = {
  // Everything except Next internals and static assets.
  matcher: ["/((?!_next/|brand/|icon\\.svg|favicon\\.ico).*)"],
};
