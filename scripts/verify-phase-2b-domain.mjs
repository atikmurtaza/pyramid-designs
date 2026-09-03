import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import { config } from "dotenv";

import { phase2BFixtures, seedPhase2BSynthetic } from "./seed-phase-2b-synthetic.mjs";

config({ path: ".env.local", quiet: true });

assert.equal(
  Number(process.versions.node.split(".")[0]),
  22,
  "Phase 2B domain verification must run under Node.js 22.",
);

const databaseModule = await import("../src/lib/server/database.ts");
const applicationRepository = await import(
  "../src/lib/server/repositories/applications.ts"
);
const backgroundJobRepository = await import(
  "../src/lib/server/repositories/background-jobs.ts"
);
const jobRepository = await import("../src/lib/server/repositories/jobs.ts");
const projectRepository = await import("../src/lib/server/repositories/projects.ts");
const staffRepository = await import("../src/lib/server/repositories/staff.ts");

const applicationInput = {
  applicationType: "JOB_APPLICATION",
  jobId: phase2BFixtures.jobId,
  fullName: "Synthetic Candidate",
  email: "synthetic.candidate@example.invalid",
  city: "Synthetic City",
  experienceLevel: "SYNTHETIC_LEVEL",
  source: "SYNTHETIC_TEST",
  consentDefinitionId: phase2BFixtures.consentDefinitionId,
  retentionPolicyId: phase2BFixtures.retentionPolicyId,
  requestId: "synthetic-phase-2b-idempotency-request",
  idempotencyKeyHash: "b".repeat(64),
  requestHash: "c".repeat(64),
  idempotencyExpiresAt: new Date("2099-01-01T00:00:00.000Z"),
  answers: [
    { jobQuestionId: phase2BFixtures.jobQuestionId, value: "Synthetic option" },
  ],
};

try {
  await seedPhase2BSynthetic();

  const projects = await projectRepository.listPublishedProjects();
  assert(projects.some((project) => project.id === phase2BFixtures.projectId));

  const openJob = await jobRepository.findOpenJobBySlug("synthetic-phase-2b-role");
  assert.equal(openJob?.id, phase2BFixtures.jobId);

  const firstApplication = await applicationRepository.createApplication(applicationInput);
  const retriedApplication = await applicationRepository.createApplication(applicationInput);
  assert.equal(retriedApplication.id, firstApplication.id, "Retry created a duplicate application.");

  await assert.rejects(
    applicationRepository.createApplication({
      ...applicationInput,
      requestHash: "1".repeat(64),
    }),
    { name: "DatabaseTransactionError", message: "Database transaction failed." },
  );

  await assert.rejects(
    databaseModule.transaction(async (db) => {
      const expiredJobId = randomUUID();
      await db.query(
        `INSERT INTO public."Job" (
           "id", "slug", "title", "departmentId", "jobLocationId", "workArrangement",
           "employmentType", "experienceLevel", "shiftSchedule", "summary",
           "applicationDeadline", "publishAt", "lifecycleState", "publishedAt", "updatedAt"
         ) VALUES (
           $1, $2, 'Synthetic Expired Role', $3, $4, 'SYNTHETIC_REMOTE',
           'SYNTHETIC_PERMANENT', 'SYNTHETIC_LEVEL', 'SYNTHETIC_SCHEDULE',
           'Synthetic expired job fixture.', CURRENT_TIMESTAMP - interval '1 minute',
           CURRENT_TIMESTAMP - interval '1 day', 'PUBLISHED', CURRENT_TIMESTAMP - interval '1 day',
           CURRENT_TIMESTAMP
         )`,
        [
          expiredJobId,
          `synthetic-expired-${randomUUID().replaceAll("-", "")}`,
          phase2BFixtures.departmentId,
          phase2BFixtures.jobLocationId,
        ],
      );
      await db.query(
        `INSERT INTO public."Application" (
           "id", "publicReference", "applicationType", "jobId", "fullName", "email", "city",
           "departmentId", "experienceLevel", "source", "retentionPolicyId", "expiresAt", "updatedAt"
         ) VALUES (
           $1, $2, 'JOB_APPLICATION', $3, 'Synthetic Expired Applicant',
           'expired.applicant@example.invalid', 'Synthetic City', $4, 'SYNTHETIC_LEVEL',
           'SYNTHETIC_TEST', $5, CURRENT_TIMESTAMP + interval '30 days', CURRENT_TIMESTAMP
         )`,
        [
          randomUUID(),
          `PD-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`,
          expiredJobId,
          phase2BFixtures.departmentId,
          phase2BFixtures.retentionPolicyId,
        ],
      );
    }),
    { name: "DatabaseTransactionError", message: "Database transaction failed." },
  );

  const secondApplication = await applicationRepository.createApplication({
    ...applicationInput,
    requestId: "synthetic-phase-2b-no-merge-request",
    idempotencyKeyHash: "d".repeat(64),
    requestHash: "e".repeat(64),
  });
  assert.notEqual(
    secondApplication.id,
    firstApplication.id,
    "Applications with matching contact snapshots were incorrectly merged.",
  );

  const matchingContactApplications = await databaseModule.query(
    `SELECT COUNT(*)::integer AS "count"
     FROM public."Application"
     WHERE "email" = 'synthetic.candidate@example.invalid'`,
  );
  assert.equal(matchingContactApplications.rows[0]?.count, 3);

  await assert.rejects(
    applicationRepository.createApplication({
      ...applicationInput,
      jobId: randomUUID(),
      idempotencyKeyHash: "f".repeat(64),
      requestHash: "0".repeat(64),
    }),
    { name: "DatabaseTransactionError", message: "Database transaction failed." },
  );

  await assert.rejects(
    databaseModule.transaction((db) =>
      db.query(
        `INSERT INTO public."CandidateFile" (
           "id", "applicationId", "storedFilename", "extension", "declaredMime", "detectedMime",
           "sizeBytes", "contentHash", "validationStatus", "technicalStatus", "securityStatus",
           "clearanceMethod", "clearedAt", "updatedAt"
         ) VALUES (
           $1, $2, $3, 'pdf', 'application/pdf', 'application/pdf', 1024, $4,
           'PASSED', 'QUARANTINED', 'CLEARED', 'MANUAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
         )`,
        [
          randomUUID(),
          firstApplication.id,
          `${randomUUID()}.pdf`,
          "7".repeat(64),
        ],
      ),
    ),
    { name: "DatabaseTransactionError", message: "Database transaction failed." },
  );

  await assert.rejects(
    databaseModule.transaction((db) =>
      db.query(
        `INSERT INTO public."Application" (
           "id", "publicReference", "applicationType", "jobId", "fullName", "email", "city",
           "departmentId", "experienceLevel", "source", "technicalStatus", "hiringStatus",
           "retentionPolicyId", "expiresAt", "submittedAt", "updatedAt"
         ) VALUES (
           $1, $2, 'JOB_APPLICATION', $3, 'Synthetic Missing Evidence',
           'missing.evidence@example.invalid', 'Synthetic City', $4, 'SYNTHETIC_LEVEL',
           'SYNTHETIC_TEST', 'SUBMITTED', 'NEW', $5, CURRENT_TIMESTAMP + interval '30 days',
           CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
         )`,
        [
          randomUUID(),
          `PD-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`,
          phase2BFixtures.jobId,
          phase2BFixtures.departmentId,
          phase2BFixtures.retentionPolicyId,
        ],
      ),
    ),
    { name: "DatabaseTransactionError", message: "Database transaction failed." },
  );

  const activeRoles = await staffRepository.getEffectiveStaffRoles(
    "synthetic-supabase-subject-admin",
  );
  assert.deepEqual(activeRoles, ["ADMIN"]);
  const disabledRoles = await staffRepository.getEffectiveStaffRoles(
    "synthetic-supabase-subject-disabled",
  );
  assert.deepEqual(disabledRoles, [], "Disabled staff retained effective permissions.");

  await assert.rejects(
    databaseModule.transaction(async (db) => {
      await applicationRepository.changeHiringStatus(
        {
          applicationId: phase2BFixtures.applicationId,
          actorStaffUserId: phase2BFixtures.adminStaffId,
          toStatus: "UNDER_REVIEW",
          reasonCode: "SYNTHETIC_REVIEW_STARTED",
          correlationId: "synthetic-phase-2b-hiring-transition",
        },
        db,
      );
      const inside = await db.query(
        `SELECT "hiringStatus" FROM public."Application" WHERE "id" = $1`,
        [phase2BFixtures.applicationId],
      );
      assert.equal(inside.rows[0]?.hiringStatus, "UNDER_REVIEW");
      throw new Error("synthetic rollback request");
    }),
    { name: "DatabaseTransactionError", message: "Database transaction failed." },
  );
  const afterRollback = await databaseModule.query(
    `SELECT "hiringStatus" FROM public."Application" WHERE "id" = $1`,
    [phase2BFixtures.applicationId],
  );
  assert.equal(afterRollback.rows[0]?.hiringStatus, "NEW");
  const rolledBackHistory = await databaseModule.query(
    `SELECT COUNT(*)::integer AS "count"
     FROM public."ApplicationStatusEvent"
     WHERE "applicationId" = $1 AND "reasonCode" = 'SYNTHETIC_REVIEW_STARTED'`,
    [phase2BFixtures.applicationId],
  );
  assert.equal(rolledBackHistory.rows[0]?.count, 0);

  await assert.rejects(
    databaseModule.query(
      `UPDATE public."ApplicationStatusEvent" SET "reasonCode" = 'REWRITTEN' WHERE "id" = $1`,
      [phase2BFixtures.statusEventId],
    ),
    { code: "55000" },
  );
  await assert.rejects(
    databaseModule.query(
      `UPDATE public."AuditEvent" SET "reasonCode" = 'REWRITTEN' WHERE "id" = $1`,
      [phase2BFixtures.auditEventId],
    ),
    { code: "55000" },
  );
  await assert.rejects(
    databaseModule.query(
      `UPDATE public."ConsentDefinition" SET "contentText" = 'Rewritten' WHERE "id" = $1`,
      [phase2BFixtures.consentDefinitionId],
    ),
    { code: "55000" },
  );
  await assert.rejects(
    databaseModule.query(
      `UPDATE public."RetentionPolicy" SET "durationDays" = 999 WHERE "id" = $1`,
      [phase2BFixtures.retentionPolicyId],
    ),
    { code: "55000" },
  );
  await assert.rejects(
    databaseModule.query(
      `UPDATE public."JobQuestion" SET "prompt" = 'Rewritten' WHERE "id" = $1`,
      [phase2BFixtures.jobQuestionId],
    ),
    { code: "55000" },
  );

  await databaseModule.query(
    `UPDATE public."BackgroundJob"
     SET "state" = 'QUEUED', "attemptCount" = 0, "availableAt" = CURRENT_TIMESTAMP,
         "claimedAt" = NULL, "leaseUntil" = NULL, "claimToken" = NULL,
         "completedAt" = NULL, "failureClass" = NULL, "errorSummary" = NULL,
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = $1`,
    [phase2BFixtures.backgroundJobId],
  );
  const claimedJobs = await backgroundJobRepository.claimBackgroundJobs(1, 60);
  assert.equal(claimedJobs.length, 1);
  assert.equal(claimedJobs[0]?.id, phase2BFixtures.backgroundJobId);
  assert.equal((await backgroundJobRepository.claimBackgroundJobs(1, 60)).length, 0);
  assert.equal(
    await backgroundJobRepository.completeBackgroundJob(
      phase2BFixtures.backgroundJobId,
      claimedJobs[0].claimToken,
    ),
    true,
  );
  assert.equal(
    await backgroundJobRepository.completeBackgroundJob(
      phase2BFixtures.backgroundJobId,
      randomUUID(),
    ),
    false,
  );

  const rollbackBucketId = randomUUID();
  await assert.rejects(
    databaseModule.transaction(async (db) => {
      await db.query(
        `INSERT INTO public."RateLimitBucket" (
           "id", "scope", "keyDigest", "windowStartedAt", "expiresAt"
         ) VALUES ($1, 'SYNTHETIC_ROLLBACK', $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + interval '1 minute')`,
        [rollbackBucketId, "9".repeat(64)],
      );
      throw new Error("synthetic rollback request");
    }),
    { name: "DatabaseTransactionError", message: "Database transaction failed." },
  );
  const rollbackBucket = await databaseModule.query(
    `SELECT COUNT(*)::integer AS "count" FROM public."RateLimitBucket" WHERE "id" = $1`,
    [rollbackBucketId],
  );
  assert.equal(rollbackBucket.rows[0]?.count, 0);

  const publicSecurity = await databaseModule.query(
    `SELECT COUNT(*)::integer AS "failures"
     FROM pg_tables
     WHERE schemaname = 'public'
       AND (
         rowsecurity = false
         OR has_table_privilege('anon', format('%I.%I', schemaname, tablename), 'SELECT,INSERT,UPDATE,DELETE')
         OR has_table_privilege('authenticated', format('%I.%I', schemaname, tablename), 'SELECT,INSERT,UPDATE,DELETE')
       )`,
  );
  assert.equal(publicSecurity.rows[0]?.failures, 0);
  const publicPolicies = await databaseModule.query(
    `SELECT COUNT(*)::integer AS "count" FROM pg_policies WHERE schemaname = 'public'`,
  );
  assert.equal(publicPolicies.rows[0]?.count, 0);

  const unsafeOperationalPayloads = await databaseModule.query(
    `SELECT
       (SELECT COUNT(*) FROM public."AuditEvent"
        WHERE COALESCE("safeMetadata"::text, '') ILIKE '%synthetic.candidate@example.invalid%')
       +
       (SELECT COUNT(*) FROM public."BackgroundJob"
        WHERE COALESCE("safePayload"::text, '') ILIKE '%synthetic.candidate@example.invalid%'
           OR COALESCE("errorSummary", '') ILIKE '%synthetic.candidate@example.invalid%')
       AS "count"`,
  );
  assert.equal(Number(unsafeOperationalPayloads.rows[0]?.count), 0);

  const packageManifest = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(packageManifest.dependencies?.["@prisma/client"], undefined);
  assert.equal(packageManifest.dependencies?.["@prisma/adapter-pg"], undefined);
  assert.equal(packageManifest.dependencies?.pg, "8.23.0");

  console.log("PHASE_2B_DOMAIN_OK");
} finally {
  await databaseModule.closeDatabasePool();
}
