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

| File                             | Contents                                                                                                                                                                   |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0000_init.sql`                  | Tables, enums, foreign keys, unique and CHECK constraints (generated)                                                                                                      |
| `0001_integrity_triggers.sql`    | Triggers for rules CHECK constraints can't express (hand-written)                                                                                                          |
| `0002_auth.sql`                  | Auth tables (sessions, auth_tokens, webauthn_challenges, rate_limit_buckets, consent_records); passkey columns (device label, revocation; credential id as base64url text) |
| `0003_drop_passkey_nickname.sql` | Replaces `nickname` with `device_label`                                                                                                                                    |
| `0004_auth_triggers.sql`         | Single-use tokens and challenges, final passkey revocation, append-only consent records                                                                                    |

## Database-enforced rules

Errors use SQLSTATE `23001` (`restrict_violation`) for frozen evidence and `23514` (`check_violation`) for rule breaks. Each rule has tests in `test/`.

| Rule                                                                                                                                                                                                                                                                        | How                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Question versions are immutable once served.** `first_served_at` is stamped automatically when an `attempt_items` row references the version; after that, UPDATE/DELETE of the version and any change to its answer options are rejected. Edit by creating a new version. | triggers `question_versions_immutable`, `answer_options_immutable`, `attempt_items_mark_served` |
| Attempt items keep exactly what was served (question version, option order, tokens, seed). Only the response columns can change, and rows can't be deleted.                                                                                                                 | trigger `attempt_items_served_frozen`                                                           |
| A moderator can't moderate their own decision. Moderation records are append-only.                                                                                                                                                                                          | triggers `moderation_records_not_assessor`, `moderation_records_append_only`                    |
| Decisions can't be deleted, and are locked once moderated or once their batch is closed.                                                                                                                                                                                    | trigger `assessment_decisions_guard`                                                            |
| **Results are released only by closing the moderation batch**: closing sets `released_at` on every decision in it. A closed batch can't reopen or take new decisions.                                                                                                       | triggers `moderation_batches_close`, `assessment_decisions_guard`                               |
| Audit log is append-only (no UPDATE, DELETE or TRUNCATE).                                                                                                                                                                                                                   | triggers `audit_log_append_only`, `audit_log_no_truncate`                                       |
| Emailed tokens and WebAuthn challenges are single use: once `used_at` (or a token's `revoked_at`) is set it can't change.                                                                                                                                                   | trigger `lms_single_use_guard` on `auth_tokens`, `webauthn_challenges`                          |
| A revoked passkey can never be restored.                                                                                                                                                                                                                                    | trigger `passkey_credentials_revocation_final`                                                  |
| POPIA consent records are append-only.                                                                                                                                                                                                                                      | trigger `consent_records_append_only`                                                           |
| Modules are `knowledge` or `practical` only.                                                                                                                                                                                                                                | enum `module_type`                                                                              |
| External evaluator grants must expire; SDP admin and evaluator grants are global.                                                                                                                                                                                           | CHECK on `role_grants`                                                                          |
| Text items need a body; audio/video need a hosted asset id and, once published, a transcript; documents need a storage key; links must be `https://`.                                                                                                                       | CHECK on `content_items`                                                                        |
| Attempts target exactly one blueprint or section; decisions target exactly one submission or attempt; batches target exactly one blueprint or brief.                                                                                                                        | CHECK constraints                                                                               |

Not enforced in the database (application layer, later): staff not enrolled as learners in their own cohort, max attempts per blueprint, section check limit of 3 attempts.

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
