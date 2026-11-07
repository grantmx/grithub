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
        text bodyRichText "core content"
        string audioAssetId "optional, hosted"
        string videoAssetId "optional, hosted"
        text transcript
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
        timestamp moderatedAt
    }
```

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
    }
    DiscussionThread {
        uuid id PK
        uuid cohortId FK
        uuid sectionId FK "nullable"
        string title
        bool locked
    }
    DiscussionPost {
        uuid id PK
        uuid threadId FK
        uuid authorId FK
        text body
    }
    SupportTicket {
        uuid id PK
        uuid raisedBy FK
        string category "academic | technical | admin"
        string status
        uuid assignedTo FK
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
