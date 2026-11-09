# Domain model (proposed)

Conventions: every table has `id` (UUID), `createdAt` and `updatedAt`. Soft-delete (`archivedAt`) is used where records feed the POE; assessment evidence is never hard-deleted. Field lists below are indicative, not final schema.

## Structure and content

```mermaid
erDiagram
    Qualification ||--o{ Module : contains
    Module ||--o{ Section : contains
    Section ||--o{ ContentItem : contains
    Section ||--o| QuestionPool : "ends with check from"
    QuestionPool }o--o{ Question : includes
    Module ||--o{ PracticalBrief : has
    PracticalBrief ||--o{ BriefVariant : has

    Qualification {
        uuid id PK
        string saqaId
        string curriculumCode
        string title
        int nqfLevel
        string status
    }
    Module {
        uuid id PK
        uuid qualificationId FK
        string code
        string type "knowledge | practical"
        string title
        int credits
        int sortOrder
    }
    Section {
        uuid id PK
        uuid moduleId FK
        string title
        string curriculumComponentRef
        int sortOrder
    }
    ContentItem {
        uuid id PK
        uuid sectionId FK
        string kind "text | audio | video | document | external_link"
        text body "required for text (the core)"
        string mediaAssetId "audio/video, hosted"
        text transcript "required once audio/video is published"
        string storageKey "document"
        string externalUrl "https only"
        string status "draft | published"
        int version
    }
    QuestionPool {
        uuid id PK
        uuid sectionId FK
        int minPoolSize
    }
    PracticalBrief {
        uuid id PK
        uuid moduleId FK
        string curriculumComponentRef
        text instructions
        text assessmentCriteria
    }
    BriefVariant {
        uuid id PK
        uuid briefId FK
        string label
        text variantInstructions
        string status
    }
```

## Question banks and assessment

```mermaid
erDiagram
    QuestionBank ||--o{ Question : holds
    Question ||--|{ QuestionVersion : "versioned as"
    QuestionVersion ||--|{ AnswerOption : has
    AssessmentBlueprint }o--|| Module : "assesses"
    AssessmentBlueprint ||--|{ BlueprintRule : "defined by"
    BlueprintRule }o--|| QuestionBank : "draws from"
    AssessmentBlueprint ||--o{ AssessmentAttempt : "instantiated as"
    AssessmentAttempt ||--|{ AttemptItem : serves
    AttemptItem }o--|| QuestionVersion : "snapshots"
    Enrolment ||--o{ AssessmentAttempt : makes
    Enrolment ||--o{ Submission : makes
    BriefVariant ||--o{ Submission : "answered by"
    Submission ||--o{ AssessmentDecision : "judged by"
    AssessmentAttempt ||--o{ AssessmentDecision : "judged by"
    AssessmentDecision ||--o{ ModerationRecord : "moderated by"
    ModerationBatch ||--o{ AssessmentDecision : groups
    ModerationBatch }o--|| Cohort : "for"
    ModerationBatch ||--o{ ModerationSampleItem : "sample"
    ModerationRecord ||--o| ModerationActionCompletion : "actions done"

    QuestionBank {
        uuid id PK
        uuid moduleId FK
        string curriculumComponentRef
        string title
    }
    Question {
        uuid id PK
        uuid bankId FK
        uuid currentVersionId FK
        string status "draft | active | retired"
    }
    QuestionVersion {
        uuid id PK
        uuid questionId FK
        int versionNo
        text stem
        string type "single | multi"
        text feedback
        timestamp firstServedAt "set => immutable"
    }
    AnswerOption {
        uuid id PK
        uuid questionVersionId FK
        text label
        bool isCorrect "server-only"
        int pinnedPosition "nullable"
        int authorOrder
    }
    AssessmentBlueprint {
        uuid id PK
        uuid moduleId FK
        string kind "section_check | formative | summative"
        int maxAttempts
        int timeLimitMinutes
        int passMarkPercent
        bool inPersonOnly
    }
    BlueprintRule {
        uuid id PK
        uuid blueprintId FK
        uuid bankId FK
        string curriculumComponentRef
        int questionCount
    }
    AssessmentAttempt {
        uuid id PK
        uuid enrolmentId FK
        uuid blueprintId FK
        int attemptNo
        string status "in_progress | submitted | graded | void"
        timestamp startedAt
        timestamp submittedAt
        int scoreRaw
        int scoreMax
    }
    AttemptItem {
        uuid id PK
        uuid attemptId FK
        uuid questionVersionId FK
        int position
        json servedOptionOrder "AnswerOption ids in served order"
        json optionTokens "opaque per-attempt ids"
        string seed
        json responseOptionIds
        bool isCorrect
        timestamp answeredAt
    }
    Submission {
        uuid id PK
        uuid enrolmentId FK
        uuid briefVariantId FK
        int attemptNo
        string storageKey
        string checksum
        int sizeBytes
        string mimeType
        timestamp submittedAt
    }
    AssessmentDecision {
        uuid id PK
        uuid assessorId FK
        uuid submissionId FK "nullable"
        uuid attemptId FK "nullable"
        string outcome "competent | not_yet_competent"
        text feedback
        uuid supersedesId FK "nullable"
        timestamp decidedAt
        uuid batchId FK
        timestamp releasedAt "set when batch closes"
    }
    ModerationBatch {
        uuid id PK
        uuid cohortId FK
        uuid blueprintId FK "nullable"
        uuid briefId FK "nullable"
        string status "open | closed"
        uuid closedBy FK
        timestamp closedAt
    }
    ModerationRecord {
        uuid id PK
        uuid decisionId FK
        uuid moderatorId FK
        string outcome "upheld | referred_back"
        text findings
        text requiredActions "nullable"
        timestamp moderatedAt
    }
    ModerationSampleItem {
        uuid id PK
        uuid batchId FK
        uuid attemptId FK "nullable"
        uuid submissionId FK "nullable"
        string reason "moderator | reassessment"
        uuid addedBy FK
    }
    ModerationActionCompletion {
        uuid id PK
        uuid moderationRecordId FK
        uuid doneBy FK
        text note
        timestamp doneAt
    }
```

### Added with moderation (2026-11-08, ADR-015)

- **Cohort** gains `moderationRatePercent` (1–100, default 25): the minimum share of each batch to sample.
- **ModerationSampleItem**: one learner's work (attempt or submission) in a batch's sample, keyed by the work so a re-decided decision stays sampled. Reason `reassessment` for appeal reassessments (added automatically, never removed).
- **ModerationRecord** gains `requiredActions`. Verdicts: Agree = upheld; Agree with actions = upheld + actions; Disagree = referred_back. One per decision version.
- **ModerationActionCompletion**: the assessor's "Actions done" note (append-only). **ModerationFeedbackRead**: when an assessor last opened Moderation feedback (sidebar badge).
- **RoleGrant**: assessor grants always name a cohort, one per cohort.

### Added with the assessment engine (2026-11-08)

- **AssessmentSchedule**: when a cohort may write a blueprint: a window (formative) or an assessment day (summative). Reassessment = another schedule.
- **PaperUnlock**: an assessor opened one learner's summative paper on the day (append-only); used once by the attempt.
- **RegisterSignoff**: the assessor's sign-off of an assessment day's register; attendance (with `idVerifiedAt/By`) is final after it.
- **RubricCriterion**: mark range per criterion for a short-answer QuestionVersion (frozen with the version). **ItemMark**: marks per criterion for one AttemptItem.
- **DecisionDraft**: an assessor's unsaved decision; recording creates an immutable AssessmentDecision.
- **Appeal**: a learner's appeal against a released decision; a moderator upholds it or orders a reassessment (one extra attempt).
- AssessmentBlueprint gains `status` (draft/published), `showAnswers`; AssessmentAttempt gains `scheduleId`, `unlockId`, `deadlineAt`, `extraMinutes`, `pausedAt`, `autoSubmitted`, `usedFallback`; AttemptItem gains `responseText`, `flagged`, `marksAwarded`, `markerNote`; QuestionVersion gains `maxMarks` and type `short_answer`.

### Added with practical assessments (2026-11-08)

- **PracticalBrief** gains `mode` (submission / observed), `maxAttempts`, `status` (draft / published). **BriefCriterion**: Met / Not yet met criteria shared by every variant.
- **Submission** is now one practical attempt: seeded, stored `briefVariantId` + `seed`, `attemptNo`, `status` (draft / submitted), `observed`, `observationNotes`, `linksConfirmed`, `scheduleId`.
- **EvidenceItem**: a private file (Blob pathname, size, type, SHA-256, scan status) or an allow-listed https link; source learner or assessor.
- **CriterionJudgement**: Met / Not yet met + comment per criterion. **PracticalDecisionDraft**: unsaved decision.
- **AssessmentSchedule** now targets a blueprint or a brief.
- New tables carry a nullable `tenant_id` (tenancy readiness).

### Added for QCTO data (2026-11-08)

See [compliance/qcto-leisa-mapping.md](compliance/qcto-leisa-mapping.md) and ADR-014.

- **LearnerQctoProfile** (one per learner per tenant): name as on ID, title, codes (gender, nationality, home language, citizen, socioeconomic and immigrant status, province, Stats SA area), `shareEmailWithQcto`; **encrypted**: national / alternate ID (with blind-index hashes), birth date, equity, disability status and rating, home and postal address, phone, cell, fax.
- **EnrolmentQctoRecord** (one per enrolment): readiness type, SOR status and issue date, FLC code and statement number, expected completion date, SDP code override (AP-led RPL).
- **ProviderAccreditation** and **QualificationAccreditation**: SDP code, accreditation number, legal name, start and end dates.
- **AssessmentCentre**; **Cohort** gains `eisaOn` and `assessmentCentreId`.
- **QctoSubmissionBatch** (a LEISA file: purpose, status, file name, storage key, SHA-256, row count, who and when) and **QctoSubmissionItem** (enrolment, row number, row hash, QCTO outcome).
- **ConsentRecord** gains `kind` (`popia_notice` / `qcto_sharing`) and `granted`.
- GLOBAL reference tables (no tenant): the QCTO code lists and `statssa_area_codes` (`packages/db/src/tenancy.ts`).

### Added with communication and support (2026-11-08, ADR-016)

- **Announcement** gains `pinnedAt` (at most one per cohort). **DiscussionThread** is now per module and cohort (`moduleId`, opening `body`, `pinnedAt`; `sectionId` and `locked` dropped). **DiscussionPost** gains `parentId` (one level, trigger-enforced), `editedAt`, `hiddenAt`/`hiddenBy`; posts are never deleted.
- **Conversation** (cohort, learner, one facilitator or the assessor; read markers per side) and **DirectMessage** (`editedAt`, `hiddenAt`). **MessageRevision**: append-only earlier text of an edited post or message.
- **ContentReport**: a learner's report of a post or message (reason, note, open / hidden / dismissed, reviewer).
- **SupportTicket** gains `cohortId`, first-reply and resolve targets (working hours), `firstRespondedAt`, `resolvedAt`, `closedAt`, `lastActivityAt`; **TicketReply**.
- **Notification** (the bell; also drives instant and digest email) and **EmailPreference** (instant / digest / off for announcements, discussions, messages, tickets).
- **SectionNote**: a facilitator note and optional recording link on a section, for one cohort.
- **LiveSession** (cohort, optional module, Zoom link, start/end, recording link, `cancelledAt`, `sequence` for calendar updates) and **SessionAttendance** (present / late / absent / excused).
- **JobRun**: claims one run of a scheduled job (weekly digest, overdue-ticket email).
- At-risk flags are computed on read (no table). Every new table carries a nullable `tenant_id`; uniqueness rules include the tenant key.

## People, cohorts and operations

```mermaid
erDiagram
    User ||--o{ PasskeyCredential : registers
    User ||--o{ RoleGrant : holds
    User ||--o{ Enrolment : "enrolled via"
    Cohort ||--o{ Enrolment : has
    Cohort }o--|| Qualification : runs
    Cohort ||--o{ RoleGrant : scopes
    Cohort ||--o{ AssessmentDay : schedules
    AssessmentDay ||--o{ AttendanceRecord : records
    Enrolment ||--o{ AttendanceRecord : has
    Cohort ||--o{ Announcement : receives
    Cohort ||--o{ DiscussionThread : hosts
    DiscussionThread ||--o{ DiscussionPost : contains
    User ||--o{ SupportTicket : raises
    User ||--o{ AuditLog : "acts in"

    User {
        uuid id PK
        string displayName
        string email
        string status "invited | active | suspended"
        timestamp popiaNoticeAcceptedAt
    }
    PasskeyCredential {
        uuid id PK
        uuid userId FK
        bytes credentialId
        bytes publicKey
        int signCount
        string transports
        string nickname
        timestamp lastUsedAt
    }
    RoleGrant {
        uuid id PK
        uuid userId FK
        string role
        uuid cohortId FK "nullable = global"
        timestamp expiresAt "evaluator"
    }
    Cohort {
        uuid id PK
        uuid qualificationId FK
        string name
        date startsOn
        date endsOn
    }
    Enrolment {
        uuid id PK
        uuid userId FK
        uuid cohortId FK
        string status "active | completed | withdrawn"
        timestamp enrolledAt
    }
    AssessmentDay {
        uuid id PK
        uuid cohortId FK
        date heldOn
        string venue
    }
    AttendanceRecord {
        uuid id PK
        uuid enrolmentId FK
        uuid assessmentDayId FK
        string status "present | absent | late | excused"
        uuid recordedBy FK
    }
    Announcement {
        uuid id PK
        uuid cohortId FK
        uuid authorId FK
        text body
        timestamp publishedAt
        timestamp pinnedAt "one per cohort"
    }
    DiscussionThread {
        uuid id PK
        uuid cohortId FK
        uuid moduleId FK "board = module x cohort"
        string title
        text body
        timestamp pinnedAt
    }
    DiscussionPost {
        uuid id PK
        uuid threadId FK
        uuid parentId FK "one level only"
        uuid authorId FK
        text body
        timestamp hiddenAt
    }
    SupportTicket {
        uuid id PK
        uuid raisedBy FK
        uuid cohortId FK
        string category "academic | technical | admin"
        string status
        uuid assignedTo FK
        timestamp firstResponseDueAt
        timestamp resolveDueAt
    }
    SyncOutbox {
        uuid id PK
        string aggregateType
        uuid aggregateId
        string eventType
        json payload "minimal fields only"
        string status "pending | sent | failed"
        int attempts
        timestamp nextAttemptAt
    }
    AuditLog {
        uuid id PK
        uuid actorId FK
        string action
        string entityType
        uuid entityId
        json before
        json after
        string ipHash
        timestamp at
    }
```

## Rules the schema must enforce

- **QuestionVersion is immutable once used.** When `firstServedAt` is set, edits are rejected (DB trigger + application check). Editing a question creates a new version and moves `Question.currentVersionId`. Old attempts keep pointing at the version they served.
- **AttemptItem is a snapshot.** It stores the exact `questionVersionId`, the served option order and the seed, so a moderator or appeal panel can see exactly what the learner saw.
- **Module.type** is limited to `knowledge | practical`. A workplace value is deliberately not allowed.
- **Results are released per batch.** Closing a `ModerationBatch` sets `releasedAt` on all its decisions in one transaction. Learners can read a decision only when `releasedAt` is set.
- **Decisions are append-only.** A change creates a new `AssessmentDecision` with `supersedesId`. Decisions with a `ModerationRecord` are locked.
- **AuditLog is append-only** (no UPDATE/DELETE grants for the app role).
- **SyncOutbox** rows are written in the same transaction as the domain change they describe.
- **Submission files** live in object storage. The DB holds only `storageKey`, checksum and metadata.
- Added helper entities not in the original list: `BlueprintRule`, `RoleGrant`, `AssessmentDay`, `DiscussionPost`, `User`. These are needed to express the rules above.
