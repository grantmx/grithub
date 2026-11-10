# 03 Capacity and load test

**What this is:** how GRIT Hub measures how many learners the LMS can serve at once (the "number of learners it accommodates" in Form 5 item 4.1.3), the test script, and the report template.

> **No figures on this page have been measured yet.** Every result field in the report template is blank until a real test run fills it in. Do not quote capacity numbers to the QCTO or anyone else until then. **TODO(T-15)**.

## 1. What limits capacity

The LMS has no per-seat licence; capacity is set by the hosting plans:

| Component            | What limits it                                                                                            | Where to read the limit            |
| -------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Vercel functions     | Concurrent executions and function duration on the plan                                                   | Vercel plan **TODO(T-05)**         |
| PostgreSQL           | Connections (the app uses at most `DATABASE_POOL_MAX` per function instance, default 5), CPU, storage     | Database plan **TODO(T-04, T-05)** |
| Vercel Blob          | Storage size and transfer; uploads go browser → storage directly, never through a function                | Blob plan **TODO(T-05)**           |
| Mux                  | Delivery minutes                                                                                          | Mux plan **TODO(T-05)**            |
| Resend               | Emails per day / month                                                                                    | Resend plan **TODO(T-05)**         |
| Built-in rate limits | Per user and per IP (e.g. 900 answer saves per hour per learner); these protect the service, not capacity | `apps/lms/lib/server/ratelimit.ts` |

The heaviest real-world moment is an **assessment day**: a cohort starting papers at the same time, then autosaving every answer. The next heaviest is evening study (page views and reading-position saves).

## 2. The test

- **Script:** [`k6/lms-load.js`](k6/lms-load.js) ([k6](https://k6.io), run with the `grafana/k6:0.57.0` container).
- **Target:** a **staging** deployment with its own database seeded with DEMO data. **Never production**: the script refuses `grithub.org.za` hosts, and sessions can only be created for DEMO accounts on non-production databases.
- **Scenarios:** learners browsing (home, programme page, section page, reading-position save; 70% of users), learners opening messages and notifications (20%), unauthenticated sign-in page and health check (10%). Ramp up 2 minutes, hold 5 minutes, ramp down 1 minute.
- **Not yet covered:** writing an assessment paper under load (it needs an open schedule and per-learner unlocks). **TODO(T-15)**: decide whether to script an assessment-day scenario before the first summative cohort.

### Steps

1. Deploy the commit under test to staging, with a staging database (never the production one).
2. Seed it: `ALLOW_DEMO_SEED=true yarn workspace db db:seed` (against the staging `DATABASE_URL`).
3. Create sessions for the DEMO learners:
   `ALLOW_DEMO_SEED=true yarn workspace lms load:sessions 10 > sessions.txt` (with the staging env vars). Keep `sessions.txt` private.
4. Look up the DEMO qualification and section ids (staging database, `qualifications` and `sections` tables).
5. Run k6 (command at the top of `k6/lms-load.js`), choosing `LMS_PEAK_VUS` (virtual users at peak).
6. Revoke the sessions: `ALLOW_DEMO_SEED=true yarn workspace lms load:sessions --revoke`. Delete `sessions.txt` and `summary.json`.
7. Fill in the report below and file it with GRIT Hub's evidence (not in this repository if it names environments or accounts).

Draft pass criteria in the script (for discussion, **TODO(T-15)**): failed requests under 1%, page response p95 under 2 s, API p95 under 800 ms.

## 3. Report template

Copy this section for each run.

```markdown
# LMS load test report

| Field                             | Value |
| --------------------------------- | ----- |
| Date and time (SAST)              |       |
| Run by (role)                     |       |
| Commit tested                     |       |
| Environment (staging URL)         |       |
| Function region / DB region       |       |
| Vercel plan / DB plan             |       |
| DATABASE_POOL_MAX                 |       |
| DEMO accounts used / sessions     |       |
| Peak virtual users (LMS_PEAK_VUS) |       |
| Duration                          |       |

## Results (from summary.json)

| Metric                                   | Target (agreed) | Measured | Pass? |
| ---------------------------------------- | --------------- | -------- | ----- |
| Requests total                           | n/a             |          |       |
| Failed requests (http_req_failed)        |                 |          |       |
| Unexpected responses                     |                 |          |       |
| Page p95 response time                   |                 |          |       |
| API p95 response time                    |                 |          |       |
| Peak DB connections (from DB dashboard)  |                 |          |       |
| Peak DB CPU                              |                 |          |       |
| Function errors / timeouts (Vercel logs) |                 |          |       |

## Observations

-

## Capacity statement (for Form 5 4.1.3)

Based on this run, the LMS on the plans above served **_ concurrent learners with _**.
Signed: **********\_\_********** (role) Date: ****\_\_****
```

## 4. Capacity statement

**TODO(T-15)**: write the statement from a measured run. Until then the Form 5 dashboard shows the live number of active learners and cohorts, which is a fact, not a capacity figure.
