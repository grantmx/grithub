# packages/db: LMS database

Postgres schema, migrations, demo seed and integrity tests for `apps/lms`.

- **ORM: [Drizzle](https://orm.drizzle.team)** (ADR-002 in `docs/lms/decisions.md`). The schema is TypeScript (`src/schema/`), migrations are plain SQL files committed in `migrations/`, and there is no binary engine, so it stays light in serverless functions.
- **Driver: [postgres.js](https://github.com/porsager/postgres)**. It works with local Docker and any managed Postgres that gives a connection string. The provider and region are still an open question (`docs/lms/architecture.md`).
- The schema follows `docs/lms/domain-model.md`. There is **no workplace module, logbook or mentor entity**: `module_type` only allows `knowledge | practical`.

## Local setup (Docker Postgres)

Prerequisites: Docker Desktop (or any Docker engine) and Node 22.

```bash
# 1. Create your local env file (git-ignored) from the template
cp packages/db/.env.example packages/db/.env
```

Fill in `packages/db/.env`. Use values that only exist on your machine, and never commit them:

```bash
POSTGRES_USER=lms_local
POSTGRES_PASSWORD=<any long random string>
POSTGRES_DB=lms_dev
POSTGRES_PORT=5433
DATABASE_URL=postgres://lms_local:<password>@localhost:5433/lms_dev
DATABASE_SSL=disable
TEST_DATABASE_URL=postgres://lms_local:<password>@localhost:5433/postgres
```

```bash
# 2. Start Postgres 17 (bound to 127.0.0.1 only)
cd packages/db
yarn db:up                       # docker compose up -d

# 3. Load the env file into your shell, then migrate and seed
set -a; . ./.env; set +a
yarn db:migrate                  # applies migrations/*.sql
yarn db:seed                     # DEMO data (idempotent)

# 4. Run the tests (each test file creates and drops its own database)
yarn test

# Optional: browse the data
yarn db:studio

# Stop (data persists in the lms-db-data volume)
yarn db:down
```

Port 5433 avoids clashing with a Postgres already running on 5432.

## Environment variables

Connection settings come **only** from environment variables. No host, region or credential is hard-coded. The database region is simply wherever the host in `DATABASE_URL` lives.

| Variable            | Used by                                   | Notes                                                                                                 |
| ------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`      | app, `db:migrate`, `db:seed`, `db:studio` | Required                                                                                              |
| `DATABASE_SSL`      | all                                       | `require` or `disable`. Defaults to `require` for any non-local host                                  |
| `DATABASE_POOL_MAX` | app                                       | Default 5. Keep it low on serverless (use the provider's pooler URL)                                  |
| `TEST_DATABASE_URL` | tests                                     | Admin connection to a **disposable** server; tests create and drop `lms_test_*` databases             |
| `ALLOW_DEMO_SEED`   | `db:seed`                                 | The seed refuses non-local hosts unless `true`, and always refuses `NODE_ENV`/`VERCEL_ENV=production` |
| `POSTGRES_*`        | `docker-compose.yml`                      | Local container only                                                                                  |

Names are listed in `.env.example`. Test variables are registered in `packages/db/turbo.json`, and app variables in `apps/lms/turbo.json`.

## Migrations

Migrations are **committed in git** and are the only way the schema changes. Every schema change needs a migration.

```bash
# After editing src/schema/*.ts:
yarn db:generate --name <short_name>     # writes migrations/NNNN_<name>.sql + snapshot
# For SQL Drizzle cannot express (triggers, functions):
yarn db:generate:custom --name <short_name>
```

Review the generated SQL, commit it with the schema change, and never edit a migration that has already been applied anywhere shared. `yarn db:generate` must report "No schema changes" on a clean tree. That's a quick drift check.

| File                                   | Contents                                                                                                                                                                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0000_init.sql`                        | Tables, enums, foreign keys, unique and CHECK constraints (generated)                                                                                                                                                                          |
| `0001_integrity_triggers.sql`          | Triggers for rules CHECK constraints can't express (hand-written)                                                                                                                                                                              |
| `0002_auth.sql`                        | Auth tables (sessions, auth_tokens, webauthn_challenges, rate_limit_buckets, consent_records); passkey columns (device label, revocation; credential id as base64url text)                                                                     |
| `0003_drop_passkey_nickname.sql`       | Replaces `nickname` with `device_label`                                                                                                                                                                                                        |
| `0004_auth_triggers.sql`               | Single-use tokens and challenges, final passkey revocation, append-only consent records                                                                                                                                                        |
| `0008_qcto.sql`                        | QCTO code-list tables, provider and qualification accreditation, assessment centres, learner QCTO profiles (encrypted columns), enrolment QCTO records, LEISA submission batches and items; cohort EISA date and assessment centre (generated) |
| `0009_qcto_reference_and_triggers.sql` | QCTO code lists from the LEISA spec; accreditation-period, SOR-vs-EISA and submission lifecycle triggers                                                                                                                                       |
| `0012_qcto_mapping.sql`                | Reconciled with `docs/lms/compliance/qcto-leisa-mapping.md`: ID-type rule, SDP code override, email sharing, QCTO sharing consent kind, tenant uniqueness via `coalesce(tenant_id, default)`                                                   |
| `0013_qcto_flc_rule.sql`               | FLC 06 exactly when the qualification is NQF 5+                                                                                                                                                                                                |

## Database-enforced rules

Errors use SQLSTATE `23001` (`restrict_violation`) for frozen evidence and `23514` (`check_violation`) for rule breaks. Each rule has tests in `test/`.

| Rule                                                                                                                                                                                                                                                                                                                                 | How                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Question versions are immutable once served.** `first_served_at` is stamped automatically when an `attempt_items` row references the version; after that, UPDATE/DELETE of the version and any change to its answer options are rejected. Edit by creating a new version.                                                          | triggers `question_versions_immutable`, `answer_options_immutable`, `attempt_items_mark_served`                                       |
| Attempt items keep exactly what was served (question version, option order, tokens, seed). Only the response columns can change, and rows can't be deleted.                                                                                                                                                                          | trigger `attempt_items_served_frozen`                                                                                                 |
| A moderator can't moderate their own decision. Moderation records are append-only.                                                                                                                                                                                                                                                   | triggers `moderation_records_not_assessor`, `moderation_records_append_only`                                                          |
| **Decisions are final once recorded** (and can't be deleted): a change is a new decision that supersedes it, for the same attempt, at most once per decision, and only while the batch is open.                                                                                                                                      | trigger `assessment_decisions_guard`                                                                                                  |
| **Results are released only by closing the moderation batch**: closing sets `released_at` on every decision in it. A closed batch can't reopen or take new decisions.                                                                                                                                                                | triggers `moderation_batches_close`, `assessment_decisions_guard`                                                                     |
| Audit log is append-only (no UPDATE, DELETE or TRUNCATE).                                                                                                                                                                                                                                                                            | triggers `audit_log_append_only`, `audit_log_no_truncate`                                                                             |
| Emailed tokens and WebAuthn challenges are single use: once `used_at` (or a token's `revoked_at`) is set it can't change.                                                                                                                                                                                                            | trigger `lms_single_use_guard` on `auth_tokens`, `webauthn_challenges`                                                                |
| A revoked passkey can never be restored.                                                                                                                                                                                                                                                                                             | trigger `passkey_credentials_revocation_final`                                                                                        |
| POPIA consent records are append-only.                                                                                                                                                                                                                                                                                               | trigger `consent_records_append_only`                                                                                                 |
| Modules are `knowledge` or `practical` only.                                                                                                                                                                                                                                                                                         | enum `module_type`                                                                                                                    |
| External evaluator grants must expire; SDP admin and evaluator grants are global.                                                                                                                                                                                                                                                    | CHECK on `role_grants`                                                                                                                |
| Text items need a body; audio/video need a hosted asset id and, once published, a transcript; documents need a storage key; links must be `https://`.                                                                                                                                                                                | CHECK on `content_items`                                                                                                              |
| Rubric criteria are frozen with their question version once served.                                                                                                                                                                                                                                                                  | trigger `rubric_criteria_immutable`                                                                                                   |
| An attempt's responses (answers, flags) freeze when it leaves `in_progress`; grading can be set once. Rubric marks (and item marks/notes) stay within the criterion range, belong to the served version, and lock once a decision is recorded.                                                                                       | triggers `attempt_items_response_frozen`, `item_marks_guard`                                                                          |
| Appeals only against released decisions; decided once, by someone other than the decision's assessor.                                                                                                                                                                                                                                | trigger `appeals_guard`                                                                                                               |
| A signed-off assessment-day register is final; sign-offs and paper unlocks are append-only. ID checks need both who and when.                                                                                                                                                                                                        | triggers `attendance_records_signed_off`, `register_signoffs_append_only`, `paper_unlocks_append_only`; CHECK on `attendance_records` |
| A published blueprint is fixed: its rules and settings can't change (title can) and it can't go back to draft. Summative blueprints are in-person only.                                                                                                                                                                              | triggers `assessment_blueprints_published_guard`, `blueprint_rules_locked`; CHECKs                                                    |
| A published practical brief is fixed (title may change); its criteria and variants can't change.                                                                                                                                                                                                                                     | triggers `practical_briefs_published_guard`, `brief_criteria_locked`, `brief_variants_locked`                                         |
| A submission's learner, brief, assigned variant and seed never change; submitting is one-way; submitted work is never deleted.                                                                                                                                                                                                       | trigger `submissions_guard`                                                                                                           |
| Learner evidence freezes at submission; all evidence and criterion judgements lock once a decision exists (scan status may still be recorded). Judgements need submitted work and the brief's own criteria. A decision needs submitted work.                                                                                         | triggers `evidence_items_guard`, `criterion_judgements_guard`, `assessment_decisions_needs_submitted`                                 |
| Evidence files need pathname, type, size and a SHA-256; links must be `https://`.                                                                                                                                                                                                                                                    | CHECK on `evidence_items`                                                                                                             |
| One open moderation batch per cohort and blueprint (or brief).                                                                                                                                                                                                                                                                       | partial unique indexes                                                                                                                |
| Attempts target exactly one blueprint or section; decisions target exactly one submission or attempt; batches target exactly one blueprint or brief.                                                                                                                                                                                 | CHECK constraints                                                                                                                     |
| QCTO code columns reference the GLOBAL code tables; a Stats SA area must be in the profile's province.                                                                                                                                                                                                                               | foreign keys                                                                                                                          |
| QCTO profile: one per learner and per national / alternate ID per tenant (blind index); each encrypted ID has its blind index; ID type 533 = national only, 570 = both, anything else = alternate only.                                                                                                                              | unique indexes, CHECKs                                                                                                                |
| Enrolment QCTO record: SOR date exactly when SOR status is 01; readiness type 1 exactly when SOR is 02; SOR date not after the cohort's EISA date; FLC 06 exactly at NQF 5+; FLC number rules (`RPLYYYYMMDD` for RPL); SDP code override only for readiness type 6.                                                                  | CHECKs; triggers `enrolment_qcto_records_rules`, `cohorts_eisa_after_sor`, `qualifications_nqf_flc`                                   |
| Qualification accreditation lies inside the provider accreditation period.                                                                                                                                                                                                                                                           | triggers `qualification_accreditations_in_period`, `provider_accreditations_covers_qualifications`                                    |
| LEISA batches move draft → generated → submitted → accepted/rejected (generated may return to draft); the file freezes once submitted, the response once given; only drafts can be deleted. Rows are added, removed or rehashed only in draft, take enrolments from the batch's cohort only, and get outcomes only after submission. | triggers `qcto_submission_batches_guard`, `qcto_submission_items_guard`; CHECKs                                                       |
| A POPIA notice consent is always granted (a QCTO sharing consent may be refused).                                                                                                                                                                                                                                                    | CHECK on `consent_records`                                                                                                            |

QCTO data is encrypted in the application (`db/pii`, ADR-014). Rules that need decrypted values or decisions (ID check digit, gender and birth date vs ID, character sets, postal codes, "all modules competent" for SOR 01, accreditation periods, submission deadlines) belong to the LEISA exporter, which is not built yet.

Enforced in the application (apps/lms/lib/server, with tests): max attempts per blueprint (plus reassessments from appeals), summative papers only after an assessor unlock, time limits, section check limit of 3 attempts. Not enforced yet: staff not enrolled as learners in their own cohort.

## Demo seed

`yarn db:seed` creates **obviously fake** data for local work and previews:

- `DEMO-0000-NOT-A-REAL-CURRICULUM`: one Knowledge module (3 sections, each with text; one video and one audio placeholder with placeholder transcripts) and one Practical module (one text section, one brief with variants A and B).
- 3 question banks × 4 questions = **12 questions**, one pool per section, with "All of the above" pinned last. There's also one formative blueprint (2 questions from each bank), one cohort, an assessment day, an open moderation batch and an announcement.
- Demo users for **every role**: SDP admin, facilitator, assessor, moderator, **external evaluator** (read-only, grant expires after 30 days), and three learners (enrolled). All names say "Demo … (fake)" and all emails use the reserved `@example.invalid` domain.
- No passkeys are seeded. Users register their own passkeys once auth exists.

Never put real people, real learner data or real curriculum content in the seed. The repo is public.

## Using it from apps/lms

```ts
import { createDb, users } from "db";

const { db } = createDb(); // reads DATABASE_URL etc.
const rows = await db.select().from(users);
```

(Not wired into `apps/lms` yet.)
