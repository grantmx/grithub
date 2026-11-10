// k6 load test for GRIT Hub Learning (docs/lms/dossier/03-capacity-and-load-test.md).
//
// Run ONLY against staging or a preview deployment seeded with DEMO data,
// never production. Example:
//
//   docker run --rm -i -v "$PWD/docs/lms/dossier/k6:/k6" grafana/k6:0.57.0 run \
//     -e LMS_BASE_URL=https://<staging host> \
//     -e LMS_SESSION_TOKENS="$(paste -sd, sessions.txt)" \
//     -e LMS_QUALIFICATION_ID=<demo qualification uuid> \
//     -e LMS_SECTION_IDS=<uuid>,<uuid>,<uuid> \
//     -e LMS_PEAK_VUS=50 \
//     --summary-export=/k6/summary.json /k6/lms-load.js
//
// Session tokens come from `yarn workspace lms load:sessions` (DEMO users
// only). Never commit sessions.txt or summary.json: they are run artefacts.
//
// Scenarios (a learner-heavy mix, like a cohort studying in the evening):
//   browse    - learners open home, programme and section pages, save reading position
//   messages  - learners open messages and notifications
//   anonymous - sign-in page and health check (unauthenticated traffic)
//
// The thresholds below are DRAFT TARGETS for discussion (TODO(T-15) in the
// dossier README), not measured results.

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate } from "k6/metrics";

const BASE = (__ENV.LMS_BASE_URL || "").replace(/\/$/, "");
const TOKENS = (__ENV.LMS_SESSION_TOKENS || "")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);
const QUALIFICATION = __ENV.LMS_QUALIFICATION_ID || "";
const SECTIONS = (__ENV.LMS_SECTION_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const PEAK = Number(__ENV.LMS_PEAK_VUS || 50);
const COOKIE = __ENV.LMS_COOKIE_NAME || "__Host-lms_session";

if (!BASE) throw new Error("Set LMS_BASE_URL (staging only).");
const HOST = (/^https?:\/\/([^/:]+)/i.exec(BASE) || [])[1] || "";
if (
  /grithub\.org\.za$/i.test(HOST) &&
  __ENV.LMS_I_KNOW_THIS_IS_NOT_PRODUCTION !== "yes"
) {
  throw new Error(
    "Refusing a grithub.org.za host. Point at staging, or set LMS_I_KNOW_THIS_IS_NOT_PRODUCTION=yes for a staging subdomain.",
  );
}

const unexpected = new Rate("unexpected_responses");

export const options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      exec: "browse",
      startVUs: 0,
      stages: [
        { duration: "2m", target: Math.ceil(PEAK * 0.7) },
        { duration: "5m", target: Math.ceil(PEAK * 0.7) },
        { duration: "1m", target: 0 },
      ],
    },
    messages: {
      executor: "ramping-vus",
      exec: "messages",
      startVUs: 0,
      stages: [
        { duration: "2m", target: Math.ceil(PEAK * 0.2) },
        { duration: "5m", target: Math.ceil(PEAK * 0.2) },
        { duration: "1m", target: 0 },
      ],
    },
    anonymous: {
      executor: "constant-arrival-rate",
      exec: "anonymous",
      rate: Math.max(1, Math.ceil(PEAK * 0.1)),
      timeUnit: "1m",
      duration: "8m",
      preAllocatedVUs: 5,
    },
  },
  thresholds: {
    // DRAFT targets (TODO(T-15)).
    http_req_failed: ["rate<0.01"],
    "http_req_duration{kind:page}": ["p(95)<2000"],
    "http_req_duration{kind:api}": ["p(95)<800"],
    unexpected_responses: ["rate<0.01"],
  },
};

function session() {
  if (TOKENS.length === 0)
    throw new Error("Set LMS_SESSION_TOKENS (from load:sessions).");
  // Spread virtual users across accounts so per-user rate limits reflect real use.
  return TOKENS[(__VU - 1) % TOKENS.length];
}

function page(path) {
  const res = http.get(`${BASE}${path}`, {
    cookies: { [COOKIE]: session() },
    redirects: 0,
    tags: { kind: "page", name: path.replace(/[0-9a-f-]{36}/g, ":id") },
  });
  const ok = check(res, { "page 200": (r) => r.status === 200 });
  unexpected.add(!ok);
  return res;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function browse() {
  group("learner browse", () => {
    page("/");
    sleep(2 + Math.random() * 3);
    if (QUALIFICATION) {
      page(`/learn/${QUALIFICATION}`);
      sleep(2 + Math.random() * 3);
    }
    if (SECTIONS.length > 0) {
      const section = pick(SECTIONS);
      page(`/learn/section/${section}`);
      // Reading time, then the reading position beacon (same-origin only).
      sleep(10 + Math.random() * 20);
      const res = http.post(
        `${BASE}/api/progress/scroll`,
        JSON.stringify({
          sectionId: section,
          percent: Math.floor(Math.random() * 100),
        }),
        {
          cookies: { [COOKIE]: session() },
          headers: { "Content-Type": "application/json", Origin: BASE },
          tags: { kind: "api", name: "/api/progress/scroll" },
        },
      );
      const ok = check(res, {
        "scroll saved": (r) =>
          r.status === 204 || r.status === 200 || r.status === 429,
      });
      unexpected.add(!ok);
    }
  });
  sleep(5 + Math.random() * 10);
}

export function messages() {
  group("learner messages", () => {
    page("/messages");
    sleep(3 + Math.random() * 5);
    page("/notifications");
  });
  sleep(10 + Math.random() * 20);
}

export function anonymous() {
  const a = http.get(`${BASE}/signin`, {
    tags: { kind: "page", name: "/signin" },
  });
  const b = http.get(`${BASE}/api/health`, {
    tags: { kind: "api", name: "/api/health" },
  });
  unexpected.add(!check(a, { "signin 200": (r) => r.status === 200 }));
  unexpected.add(!check(b, { "health 200": (r) => r.status === 200 }));
}
