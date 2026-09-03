import { pathToFileURL } from "node:url";

import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

export const phase2BFixtures = Object.freeze({
  departmentId: "00000000-0000-4000-8000-000000000001",
  disciplineId: "00000000-0000-4000-8000-000000000002",
  sectorId: "00000000-0000-4000-8000-000000000003",
  projectId: "00000000-0000-4000-8000-000000000004",
  projectMediaId: "00000000-0000-4000-8000-000000000005",
  projectCreditId: "00000000-0000-4000-8000-000000000006",
  jobLocationId: "00000000-0000-4000-8000-000000000007",
  jobId: "00000000-0000-4000-8000-000000000008",
  jobQuestionId: "00000000-0000-4000-8000-000000000009",
  jobQuestionOptionId: "00000000-0000-4000-8000-00000000000a",
  consentDefinitionId: "00000000-0000-4000-8000-00000000000b",
  retentionPolicyId: "00000000-0000-4000-8000-00000000000c",
  adminStaffId: "00000000-0000-4000-8000-00000000000d",
  disabledStaffId: "00000000-0000-4000-8000-00000000000e",
  adminRoleId: "00000000-0000-4000-8000-00000000000f",
  disabledRoleId: "00000000-0000-4000-8000-000000000010",
  applicationId: "00000000-0000-4000-8000-000000000011",
  candidateFileId: "00000000-0000-4000-8000-000000000012",
  fileReviewId: "00000000-0000-4000-8000-000000000013",
  candidateConsentId: "00000000-0000-4000-8000-000000000014",
  statusEventId: "00000000-0000-4000-8000-000000000015",
  auditEventId: "00000000-0000-4000-8000-000000000016",
  backgroundJobId: "00000000-0000-4000-8000-000000000017",
  applicationAnswerId: "00000000-0000-4000-8000-000000000018",
});

export async function seedPhase2BSynthetic() {
  const databaseModule = await import("../src/lib/server/database.ts");
  const id = phase2BFixtures;

  await databaseModule.transaction(async (db) => {
    await db.query(
      `INSERT INTO public."Department" ("id", "code", "slug", "name", "publicDescription", "sortOrder")
       VALUES ($1, 'SYNTHETIC_DESIGN', 'synthetic-design', 'Synthetic Design Department',
               'Synthetic Phase 2B fixture only; not production company content.', 10)
       ON CONFLICT ("id") DO NOTHING`,
      [id.departmentId],
    );
    await db.query(
      `INSERT INTO public."Discipline" ("id", "slug", "name", "sortOrder")
       VALUES ($1, 'synthetic-systems', 'Synthetic Systems', 10)
       ON CONFLICT ("id") DO NOTHING`,
      [id.disciplineId],
    );
    await db.query(
      `INSERT INTO public."Sector" ("id", "slug", "name", "sortOrder")
       VALUES ($1, 'synthetic-sector', 'Synthetic Sector', 10)
       ON CONFLICT ("id") DO NOTHING`,
      [id.sectorId],
    );
    await db.query(
      `INSERT INTO public."Project" (
         "id", "slug", "title", "clientDescriptor", "year", "summary", "brief",
         "featured", "publicationState", "publishAt", "publishedAt", "updatedAt"
       ) VALUES (
         $1, 'synthetic-phase-2b-project', 'Synthetic Phase 2B Project',
         'Fictional client descriptor', 2026,
         'Synthetic database fixture only; not an approved Pyramid Designs project.',
         'Synthetic verification brief.', false, 'PUBLISHED', $2, $2, CURRENT_TIMESTAMP
       ) ON CONFLICT ("id") DO NOTHING`,
      [id.projectId, new Date("2026-09-03T00:00:00.000Z")],
    );
    await db.query(
      `INSERT INTO public."ProjectMedia" (
         "id", "projectId", "mediaType", "sourceReference", "publicDeliveryPath",
         "width", "height", "altText", "sortOrder", "updatedAt"
       ) VALUES ($1, $2, 'IMAGE', 'synthetic-fixture-source',
                 '/synthetic/phase-2b-project.webp', 1600, 900,
                 'Synthetic Phase 2B project media placeholder.', 0, CURRENT_TIMESTAMP)
       ON CONFLICT ("id") DO NOTHING`,
      [id.projectMediaId, id.projectId],
    );
    await db.query(
      `INSERT INTO public."ProjectCredit" ("id", "projectId", "displayName", "role", "sortOrder")
       VALUES ($1, $2, 'Synthetic Contributor', 'Synthetic verification role', 0)
       ON CONFLICT ("id") DO NOTHING`,
      [id.projectCreditId, id.projectId],
    );
    await db.query(
      `INSERT INTO public."ProjectDiscipline" ("projectId", "disciplineId") VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [id.projectId, id.disciplineId],
    );
    await db.query(
      `INSERT INTO public."ProjectSector" ("projectId", "sectorId") VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [id.projectId, id.sectorId],
    );
    await db.query(
      `INSERT INTO public."JobLocation" ("id", "label", "city", "publicAddress")
       VALUES ($1, 'Synthetic Remote Location', 'Synthetic City', 'Synthetic fixture; not a real address')
       ON CONFLICT ("id") DO NOTHING`,
      [id.jobLocationId],
    );
    await db.query(
      `INSERT INTO public."Job" (
         "id", "slug", "title", "departmentId", "jobLocationId", "workArrangement",
         "employmentType", "experienceLevel", "shiftSchedule", "summary",
         "applicationDeadline", "publishAt", "lifecycleState", "publishedAt", "updatedAt"
       ) VALUES (
         $1, 'synthetic-phase-2b-role', 'Synthetic Phase 2B Role', $2, $3,
         'SYNTHETIC_REMOTE', 'SYNTHETIC_PERMANENT', 'SYNTHETIC_LEVEL', 'SYNTHETIC_SCHEDULE',
         'Synthetic database fixture only; not a real vacancy.', $4, $5, 'PUBLISHED', $5, CURRENT_TIMESTAMP
       ) ON CONFLICT ("id") DO NOTHING`,
      [
        id.jobId,
        id.departmentId,
        id.jobLocationId,
        new Date("2099-01-01T00:00:00.000Z"),
        new Date("2026-09-03T00:00:00.000Z"),
      ],
    );
    await db.query(
      `INSERT INTO public."JobQuestion" (
         "id", "jobId", "questionType", "prompt", "required", "sortOrder"
       ) VALUES ($1, $2, 'SELECT', 'Choose the synthetic verification option.', true, 0)
       ON CONFLICT ("id") DO NOTHING`,
      [id.jobQuestionId, id.jobId],
    );
    await db.query(
      `INSERT INTO public."JobQuestionOption" ("id", "jobQuestionId", "label", "sortOrder")
       VALUES ($1, $2, 'Synthetic option', 0)
       ON CONFLICT ("id") DO NOTHING`,
      [id.jobQuestionOptionId, id.jobQuestionId],
    );
    await db.query(
      `INSERT INTO public."ConsentDefinition" (
         "id", "consentType", "version", "contentText", "effectiveFrom", "status"
       ) VALUES (
         $1, 'SYNTHETIC_APPLICATION_PROCESSING', 'phase-2b-fixture-v1',
         'Synthetic consent fixture only. This is not approved legal or production wording.',
         $2, 'ACTIVE'
       ) ON CONFLICT ("id") DO NOTHING`,
      [id.consentDefinitionId, new Date("2026-09-03T00:00:00.000Z")],
    );
    await db.query(
      `INSERT INTO public."RetentionPolicy" (
         "id", "category", "version", "durationDays", "effectiveFrom", "status"
       ) VALUES ($1, 'SYNTHETIC_JOB_APPLICATION', 'phase-2b-fixture-v1', 30, $2, 'ACTIVE')
       ON CONFLICT ("id") DO NOTHING`,
      [id.retentionPolicyId, new Date("2026-09-03T00:00:00.000Z")],
    );
    await db.query(
      `INSERT INTO public."StaffUser" (
         "id", "supabaseUserId", "status", "updatedAt"
       ) VALUES ($1, 'synthetic-supabase-subject-admin', 'ACTIVE', CURRENT_TIMESTAMP)
       ON CONFLICT ("id") DO NOTHING`,
      [id.adminStaffId],
    );
    await db.query(
      `INSERT INTO public."StaffUser" (
         "id", "supabaseUserId", "status", "disabledAt", "updatedAt"
       ) VALUES ($1, 'synthetic-supabase-subject-disabled', 'DISABLED', $2, CURRENT_TIMESTAMP)
       ON CONFLICT ("id") DO NOTHING`,
      [id.disabledStaffId, new Date("2026-09-03T00:00:00.000Z")],
    );
    await db.query(
      `INSERT INTO public."UserRole" (
         "id", "staffUserId", "roleCode", "grantedByStaffUserId"
       ) VALUES ($1, $2, 'ADMIN', $2)
       ON CONFLICT ("id") DO NOTHING`,
      [id.adminRoleId, id.adminStaffId],
    );
    await db.query(
      `INSERT INTO public."UserRole" (
         "id", "staffUserId", "roleCode", "grantedByStaffUserId"
       ) VALUES ($1, $2, 'HIRING_REVIEWER', $3)
       ON CONFLICT ("id") DO NOTHING`,
      [id.disabledRoleId, id.disabledStaffId, id.adminStaffId],
    );
    await db.query(
      `INSERT INTO public."Application" (
         "id", "publicReference", "applicationType", "jobId", "fullName", "email", "city",
         "departmentId", "experienceLevel", "source", "technicalStatus", "hiringStatus",
         "retentionPolicyId", "expiresAt", "submittedAt", "updatedAt"
       ) VALUES (
         $1, 'PD-SYNTHETIC-2B', 'JOB_APPLICATION', $2, 'Synthetic Candidate',
         'synthetic.candidate@example.invalid', 'Synthetic City', $3, 'SYNTHETIC_LEVEL',
         'SYNTHETIC_SEED', 'SUBMITTED', 'NEW', $4, $5, $6, CURRENT_TIMESTAMP
       ) ON CONFLICT ("id") DO NOTHING`,
      [
        id.applicationId,
        id.jobId,
        id.departmentId,
        id.retentionPolicyId,
        new Date("2026-10-03T00:00:00.000Z"),
        new Date("2026-09-03T00:00:00.000Z"),
      ],
    );
    await db.query(
      `INSERT INTO public."ApplicationAnswer" (
         "id", "applicationId", "jobQuestionId", "questionTextSnapshot",
         "questionTypeSnapshot", "selectedOptionLabelSnapshot"
       ) VALUES ($1, $2, $3, 'Choose the synthetic verification option.', 'SELECT', 'Synthetic option')
       ON CONFLICT ("id") DO NOTHING`,
      [id.applicationAnswerId, id.applicationId, id.jobQuestionId],
    );
    await db.query(
      `INSERT INTO public."CandidateConsent" (
         "id", "applicationId", "consentDefinitionId", "decision", "source", "requestId"
       ) VALUES ($1, $2, $3, 'ACCEPTED', 'JOB_FORM', 'synthetic-phase-2b-request')
       ON CONFLICT ("id") DO NOTHING`,
      [id.candidateConsentId, id.applicationId, id.consentDefinitionId],
    );
    await db.query(
      `INSERT INTO public."ApplicationStatusEvent" (
         "id", "applicationId", "fromStatus", "toStatus", "actorType", "systemActorCode", "reasonCode"
       ) VALUES ($1, $2, NULL, 'NEW', 'SYSTEM', 'SYNTHETIC_SEED', 'SYNTHETIC_SUBMISSION')
       ON CONFLICT ("id") DO NOTHING`,
      [id.statusEventId, id.applicationId],
    );
    await db.query(
      `INSERT INTO public."CandidateFile" (
         "id", "applicationId", "driveFileId", "driveZoneCode", "storedFilename", "extension",
         "declaredMime", "detectedMime", "sizeBytes", "contentHash", "validationStatus",
         "technicalStatus", "securityStatus", "clearanceMethod", "clearedAt", "updatedAt"
       ) VALUES (
         $1, $2, 'synthetic-drive-object-phase-2b', 'SYNTHETIC_QUARANTINE',
         '00000000-0000-4000-8000-000000000012.pdf', 'pdf', 'application/pdf', 'application/pdf',
         1024, $3, 'PASSED', 'QUARANTINED', 'CLEARED', 'MANUAL', $4, CURRENT_TIMESTAMP
       ) ON CONFLICT ("id") DO NOTHING`,
      [id.candidateFileId, id.applicationId, "a".repeat(64), new Date("2026-09-03T00:00:00.000Z")],
    );
    await db.query(
      `INSERT INTO public."FileSecurityReview" (
         "id", "candidateFileId", "method", "systemActorCode", "toolDescription", "toolVersion",
         "fileHashSnapshot", "outcome", "outcomeCode", "safeSummary", "idempotencyKey",
         "startedAt", "completedAt"
       ) VALUES (
         $1, $2, 'MANUAL', 'SYNTHETIC_SEED', 'SYNTHETIC_FIXTURE_NO_SCAN', 'fixture-v1',
         $3, 'CLEARED', 'SYNTHETIC_FIXTURE_ONLY', 'No file exists; metadata fixture only.',
         'synthetic-phase-2b-file-review', $4, $4
       ) ON CONFLICT ("id") DO NOTHING`,
      [id.fileReviewId, id.candidateFileId, "a".repeat(64), new Date("2026-09-03T00:00:00.000Z")],
    );
    await db.query(
      `INSERT INTO public."AuditEvent" (
         "id", "actorType", "actionCode", "targetType", "targetId", "outcome",
         "reasonCode", "correlationId", "safeMetadata"
       ) VALUES (
         $1, 'SYSTEM', 'SYNTHETIC_APPLICATION_SEEDED', 'APPLICATION', $2, 'SUCCEEDED',
         'SYNTHETIC_FIXTURE', 'synthetic-phase-2b-seed', '{"fixture":true}'::jsonb
       ) ON CONFLICT ("id") DO NOTHING`,
      [id.auditEventId, id.applicationId],
    );
    await db.query(
      `INSERT INTO public."BackgroundJob" (
         "id", "jobType", "applicationId", "payloadReference", "safePayload", "dedupeKey",
         "availableAt", "updatedAt"
       ) VALUES (
         $1, 'SYNTHETIC_RECONCILIATION', $2, 'synthetic-phase-2b-reference',
         '{"fixture":true}'::jsonb, 'synthetic-phase-2b-background-job', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       ) ON CONFLICT ("id") DO NOTHING`,
      [id.backgroundJobId, id.applicationId],
    );
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const databaseModule = await import("../src/lib/server/database.ts");
  try {
    await seedPhase2BSynthetic();
    console.log("PHASE_2B_SYNTHETIC_SEED_OK");
  } finally {
    await databaseModule.closeDatabasePool();
  }
}
