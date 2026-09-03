-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('CONTENT_EDITOR', 'HIRING_REVIEWER', 'HIRING_MANAGER', 'ADMIN', 'AUDITOR');

-- CreateEnum
CREATE TYPE "PublicationState" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectMediaType" AS ENUM ('IMAGE', 'VIDEO', 'POSTER', 'MODEL_3D');

-- CreateEnum
CREATE TYPE "JobLifecycleState" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CompensationPublicationMode" AS ENUM ('HIDDEN', 'NUMERIC_RANGE', 'APPROVED_TEXT');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'SELECT', 'YES_NO');

-- CreateEnum
CREATE TYPE "ApplicationType" AS ENUM ('JOB_APPLICATION', 'TALENT_NETWORK');

-- CreateEnum
CREATE TYPE "TalentEngagementType" AS ENUM ('PERMANENT_INTEREST', 'FREELANCE_PROJECT', 'INTERNSHIP_EARLY_CAREER', 'PORTFOLIO_INTRODUCTION');

-- CreateEnum
CREATE TYPE "ApplicationTechnicalStatus" AS ENUM ('SUBMISSION_PENDING', 'SECURITY_PENDING', 'SUBMITTED', 'FAILED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "HiringStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "FileValidationStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "FileTechnicalStatus" AS ENUM ('UPLOAD_PENDING', 'QUARANTINED', 'PROCESSING_FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "FileSecurityStatus" AS ENUM ('UNREVIEWED', 'IN_REVIEW', 'CLEARED', 'REJECTED', 'REVIEW_FAILED');

-- CreateEnum
CREATE TYPE "SecurityReviewMethod" AS ENUM ('MANUAL', 'AUTOMATED');

-- CreateEnum
CREATE TYPE "SecurityReviewOutcome" AS ENUM ('CLEARED', 'REJECTED', 'INDETERMINATE', 'FAILED');

-- CreateEnum
CREATE TYPE "ConsentDecision" AS ENUM ('ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ConsentSource" AS ENUM ('JOB_FORM', 'TALENT_FORM');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('STAFF', 'SYSTEM', 'ANONYMOUS');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCEEDED', 'DENIED', 'FAILED');

-- CreateEnum
CREATE TYPE "BackgroundJobState" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'DEAD');

-- CreateEnum
CREATE TYPE "IdempotencyState" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "StaffUser" (
    "id" UUID NOT NULL,
    "supabaseUserId" VARCHAR(128) NOT NULL,
    "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "disabledAt" TIMESTAMPTZ(6),

    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" UUID NOT NULL,
    "staffUserId" UUID NOT NULL,
    "roleCode" "StaffRole" NOT NULL,
    "grantedByStaffUserId" UUID NOT NULL,
    "grantedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(6),

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "publicDescription" VARCHAR(1000),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discipline" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Discipline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "clientDescriptor" VARCHAR(160),
    "year" INTEGER,
    "summary" VARCHAR(600) NOT NULL,
    "brief" TEXT,
    "challenge" JSONB,
    "approach" JSONB,
    "outcome" JSONB,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "publicationState" "PublicationState" NOT NULL DEFAULT 'DRAFT',
    "publishAt" TIMESTAMPTZ(6),
    "publishedAt" TIMESTAMPTZ(6),
    "archivedAt" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMedia" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "mediaType" "ProjectMediaType" NOT NULL,
    "sourceReference" VARCHAR(255),
    "publicDeliveryPath" VARCHAR(500),
    "posterReference" VARCHAR(500),
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" INTEGER,
    "altText" VARCHAR(500),
    "caption" VARCHAR(1000),
    "accessibilityDescription" VARCHAR(2000),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ProjectMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCredit" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "displayName" VARCHAR(160) NOT NULL,
    "role" VARCHAR(120) NOT NULL,
    "approvedUrl" VARCHAR(500),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProjectCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDiscipline" (
    "projectId" UUID NOT NULL,
    "disciplineId" UUID NOT NULL,

    CONSTRAINT "ProjectDiscipline_pkey" PRIMARY KEY ("projectId","disciplineId")
);

-- CreateTable
CREATE TABLE "ProjectSector" (
    "projectId" UUID NOT NULL,
    "sectorId" UUID NOT NULL,

    CONSTRAINT "ProjectSector_pkey" PRIMARY KEY ("projectId","sectorId")
);

-- CreateTable
CREATE TABLE "JobLocation" (
    "id" UUID NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "publicAddress" VARCHAR(300),
    "publicMapUrl" VARCHAR(500),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "JobLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "departmentId" UUID NOT NULL,
    "jobLocationId" UUID NOT NULL,
    "workArrangement" VARCHAR(40) NOT NULL,
    "employmentType" VARCHAR(40) NOT NULL,
    "experienceLevel" VARCHAR(40) NOT NULL,
    "shiftSchedule" VARCHAR(80) NOT NULL,
    "compensationMode" "CompensationPublicationMode" NOT NULL DEFAULT 'HIDDEN',
    "compensationMinMinor" BIGINT,
    "compensationMaxMinor" BIGINT,
    "compensationCurrency" CHAR(3),
    "compensationPeriod" VARCHAR(30),
    "compensationText" VARCHAR(300),
    "summary" VARCHAR(600) NOT NULL,
    "responsibilities" JSONB,
    "requiredQualifications" JSONB,
    "preferredQualifications" JSONB,
    "hiringProcessCopy" JSONB,
    "applicationDeadline" TIMESTAMPTZ(6),
    "publishAt" TIMESTAMPTZ(6),
    "lifecycleState" "JobLifecycleState" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMPTZ(6),
    "closedAt" TIMESTAMPTZ(6),
    "archivedAt" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobQuestion" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "prompt" VARCHAR(500) NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobQuestionOption" (
    "id" UUID NOT NULL,
    "jobQuestionId" UUID NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "JobQuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentDefinition" (
    "id" UUID NOT NULL,
    "consentType" VARCHAR(60) NOT NULL,
    "version" VARCHAR(40) NOT NULL,
    "contentText" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(6) NOT NULL,
    "status" "PolicyStatus" NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionPolicy" (
    "id" UUID NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "version" VARCHAR(40) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(6) NOT NULL,
    "status" "PolicyStatus" NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" UUID NOT NULL,
    "publicReference" VARCHAR(24) NOT NULL,
    "applicationType" "ApplicationType" NOT NULL,
    "jobId" UUID,
    "fullName" VARCHAR(160),
    "email" VARCHAR(320),
    "city" VARCHAR(120),
    "phoneOrWhatsApp" VARCHAR(40),
    "departmentId" UUID NOT NULL,
    "experienceLevel" VARCHAR(40) NOT NULL,
    "specialism" VARCHAR(120),
    "portfolioUrl" VARCHAR(500),
    "professionalUrl" VARCHAR(500),
    "availabilityText" VARCHAR(200),
    "remoteAvailable" BOOLEAN,
    "shortIntroduction" VARCHAR(2000),
    "engagementType" "TalentEngagementType",
    "preferredEngagement" VARCHAR(80),
    "freelancerRateMinMinor" BIGINT,
    "freelancerRateMaxMinor" BIGINT,
    "rateCurrency" CHAR(3),
    "accommodationContactRequested" BOOLEAN NOT NULL DEFAULT false,
    "source" VARCHAR(40) NOT NULL,
    "safeCampaignCode" VARCHAR(80),
    "technicalStatus" "ApplicationTechnicalStatus" NOT NULL DEFAULT 'SUBMISSION_PENDING',
    "hiringStatus" "HiringStatus",
    "retentionPolicyId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "submittedAt" TIMESTAMPTZ(6),
    "withdrawnAt" TIMESTAMPTZ(6),
    "deletionRequestedAt" TIMESTAMPTZ(6),
    "deletionCompletedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationAnswer" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "jobQuestionId" UUID,
    "questionTextSnapshot" VARCHAR(500) NOT NULL,
    "questionTypeSnapshot" "QuestionType" NOT NULL,
    "answerText" TEXT,
    "answerBoolean" BOOLEAN,
    "selectedOptionLabelSnapshot" VARCHAR(200),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateFile" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "driveFileId" VARCHAR(255),
    "driveZoneCode" VARCHAR(60),
    "storedFilename" VARCHAR(80) NOT NULL,
    "extension" VARCHAR(10) NOT NULL,
    "declaredMime" VARCHAR(120) NOT NULL,
    "detectedMime" VARCHAR(120),
    "sizeBytes" INTEGER NOT NULL,
    "contentHash" CHAR(64),
    "validationStatus" "FileValidationStatus" NOT NULL DEFAULT 'PENDING',
    "technicalStatus" "FileTechnicalStatus" NOT NULL DEFAULT 'UPLOAD_PENDING',
    "securityStatus" "FileSecurityStatus" NOT NULL DEFAULT 'UNREVIEWED',
    "clearanceMethod" "SecurityReviewMethod",
    "clearedAt" TIMESTAMPTZ(6),
    "deletedAt" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CandidateFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileSecurityReview" (
    "id" UUID NOT NULL,
    "candidateFileId" UUID NOT NULL,
    "method" "SecurityReviewMethod" NOT NULL,
    "reviewerStaffUserId" UUID,
    "systemActorCode" VARCHAR(60),
    "toolDescription" VARCHAR(200) NOT NULL,
    "toolVersion" VARCHAR(80),
    "fileHashSnapshot" CHAR(64) NOT NULL,
    "outcome" "SecurityReviewOutcome" NOT NULL,
    "outcomeCode" VARCHAR(80) NOT NULL,
    "safeSummary" VARCHAR(500),
    "idempotencyKey" VARCHAR(120) NOT NULL,
    "startedAt" TIMESTAMPTZ(6) NOT NULL,
    "completedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileSecurityReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateConsent" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "consentDefinitionId" UUID NOT NULL,
    "decision" "ConsentDecision" NOT NULL,
    "recordedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "ConsentSource" NOT NULL,
    "requestId" VARCHAR(120) NOT NULL,

    CONSTRAINT "CandidateConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationStatusEvent" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "fromStatus" "HiringStatus",
    "toStatus" "HiringStatus" NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "actorStaffUserId" UUID,
    "systemActorCode" VARCHAR(60),
    "reasonCode" VARCHAR(80) NOT NULL,
    "summary" VARCHAR(500),
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "AuditActorType" NOT NULL,
    "actorStaffUserId" UUID,
    "actionCode" VARCHAR(100) NOT NULL,
    "targetType" VARCHAR(60) NOT NULL,
    "targetId" UUID NOT NULL,
    "outcome" "AuditOutcome" NOT NULL,
    "reasonCode" VARCHAR(80),
    "correlationId" VARCHAR(120) NOT NULL,
    "safeMetadata" JSONB,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" UUID NOT NULL,
    "jobType" VARCHAR(80) NOT NULL,
    "applicationId" UUID,
    "candidateFileId" UUID,
    "payloadReference" VARCHAR(160),
    "safePayload" JSONB,
    "state" "BackgroundJobState" NOT NULL DEFAULT 'QUEUED',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "availableAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMPTZ(6),
    "leaseUntil" TIMESTAMPTZ(6),
    "claimToken" UUID,
    "completedAt" TIMESTAMPTZ(6),
    "failureClass" VARCHAR(60),
    "errorSummary" VARCHAR(300),
    "dedupeKey" VARCHAR(160),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" UUID NOT NULL,
    "scope" VARCHAR(80) NOT NULL,
    "keyHash" CHAR(64) NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "state" "IdempotencyState" NOT NULL DEFAULT 'IN_PROGRESS',
    "resultReference" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" UUID NOT NULL,
    "scope" VARCHAR(80) NOT NULL,
    "keyDigest" CHAR(64) NOT NULL,
    "windowStartedAt" TIMESTAMPTZ(6) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_supabaseUserId_key" ON "StaffUser"("supabaseUserId");

-- CreateIndex
CREATE INDEX "UserRole_staffUserId_revokedAt_idx" ON "UserRole"("staffUserId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Department_slug_key" ON "Department"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Discipline_slug_key" ON "Discipline"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_slug_key" ON "Sector"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Project_publicationState_featured_publishedAt_idx" ON "Project"("publicationState", "featured", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMedia_projectId_sortOrder_key" ON "ProjectMedia"("projectId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCredit_projectId_sortOrder_key" ON "ProjectCredit"("projectId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "JobLocation_label_key" ON "JobLocation"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Job_slug_key" ON "Job"("slug");

-- CreateIndex
CREATE INDEX "Job_lifecycleState_publishAt_applicationDeadline_idx" ON "Job"("lifecycleState", "publishAt", "applicationDeadline");

-- CreateIndex
CREATE INDEX "Job_departmentId_lifecycleState_idx" ON "Job"("departmentId", "lifecycleState");

-- CreateIndex
CREATE UNIQUE INDEX "JobQuestion_jobId_sortOrder_key" ON "JobQuestion"("jobId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "JobQuestionOption_jobQuestionId_sortOrder_key" ON "JobQuestionOption"("jobQuestionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "JobQuestionOption_jobQuestionId_label_key" ON "JobQuestionOption"("jobQuestionId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentDefinition_consentType_version_key" ON "ConsentDefinition"("consentType", "version");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionPolicy_category_version_key" ON "RetentionPolicy"("category", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Application_publicReference_key" ON "Application"("publicReference");

-- CreateIndex
CREATE INDEX "Application_jobId_hiringStatus_createdAt_idx" ON "Application"("jobId", "hiringStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Application_applicationType_hiringStatus_createdAt_idx" ON "Application"("applicationType", "hiringStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Application_expiresAt_idx" ON "Application"("expiresAt");

-- CreateIndex
CREATE INDEX "ApplicationAnswer_applicationId_idx" ON "ApplicationAnswer"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateFile_driveFileId_key" ON "CandidateFile"("driveFileId");

-- CreateIndex
CREATE INDEX "CandidateFile_securityStatus_createdAt_idx" ON "CandidateFile"("securityStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FileSecurityReview_idempotencyKey_key" ON "FileSecurityReview"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FileSecurityReview_candidateFileId_completedAt_idx" ON "FileSecurityReview"("candidateFileId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateConsent_applicationId_consentDefinitionId_key" ON "CandidateConsent"("applicationId", "consentDefinitionId");

-- CreateIndex
CREATE INDEX "ApplicationStatusEvent_applicationId_occurredAt_idx" ON "ApplicationStatusEvent"("applicationId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_targetType_targetId_occurredAt_idx" ON "AuditEvent"("targetType", "targetId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorStaffUserId_occurredAt_idx" ON "AuditEvent"("actorStaffUserId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "BackgroundJob_dedupeKey_key" ON "BackgroundJob"("dedupeKey");

-- CreateIndex
CREATE INDEX "BackgroundJob_state_availableAt_idx" ON "BackgroundJob"("state", "availableAt");

-- CreateIndex
CREATE INDEX "BackgroundJob_leaseUntil_idx" ON "BackgroundJob"("leaseUntil");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_scope_keyHash_key" ON "IdempotencyRecord"("scope", "keyHash");

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitBucket_scope_keyDigest_windowStartedAt_key" ON "RateLimitBucket"("scope", "keyDigest", "windowStartedAt");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_grantedByStaffUserId_fkey" FOREIGN KEY ("grantedByStaffUserId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMedia" ADD CONSTRAINT "ProjectMedia_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCredit" ADD CONSTRAINT "ProjectCredit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDiscipline" ADD CONSTRAINT "ProjectDiscipline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDiscipline" ADD CONSTRAINT "ProjectDiscipline_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSector" ADD CONSTRAINT "ProjectSector_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSector" ADD CONSTRAINT "ProjectSector_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_jobLocationId_fkey" FOREIGN KEY ("jobLocationId") REFERENCES "JobLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobQuestion" ADD CONSTRAINT "JobQuestion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobQuestionOption" ADD CONSTRAINT "JobQuestionOption_jobQuestionId_fkey" FOREIGN KEY ("jobQuestionId") REFERENCES "JobQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_retentionPolicyId_fkey" FOREIGN KEY ("retentionPolicyId") REFERENCES "RetentionPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAnswer" ADD CONSTRAINT "ApplicationAnswer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAnswer" ADD CONSTRAINT "ApplicationAnswer_jobQuestionId_fkey" FOREIGN KEY ("jobQuestionId") REFERENCES "JobQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateFile" ADD CONSTRAINT "CandidateFile_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileSecurityReview" ADD CONSTRAINT "FileSecurityReview_candidateFileId_fkey" FOREIGN KEY ("candidateFileId") REFERENCES "CandidateFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileSecurityReview" ADD CONSTRAINT "FileSecurityReview_reviewerStaffUserId_fkey" FOREIGN KEY ("reviewerStaffUserId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateConsent" ADD CONSTRAINT "CandidateConsent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateConsent" ADD CONSTRAINT "CandidateConsent_consentDefinitionId_fkey" FOREIGN KEY ("consentDefinitionId") REFERENCES "ConsentDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusEvent" ADD CONSTRAINT "ApplicationStatusEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusEvent" ADD CONSTRAINT "ApplicationStatusEvent_actorStaffUserId_fkey" FOREIGN KEY ("actorStaffUserId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorStaffUserId_fkey" FOREIGN KEY ("actorStaffUserId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundJob" ADD CONSTRAINT "BackgroundJob_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundJob" ADD CONSTRAINT "BackgroundJob_candidateFileId_fkey" FOREIGN KEY ("candidateFileId") REFERENCES "CandidateFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Phase 2B database invariants that Prisma cannot express.
ALTER TABLE "StaffUser"
  ADD CONSTRAINT "StaffUser_disabled_state_check"
  CHECK (("status" = 'DISABLED' AND "disabledAt" IS NOT NULL) OR ("status" = 'ACTIVE' AND "disabledAt" IS NULL));

ALTER TABLE "Project"
  ADD CONSTRAINT "Project_slug_check" CHECK ("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  ADD CONSTRAINT "Project_year_check" CHECK ("year" IS NULL OR "year" BETWEEN 1900 AND 2200),
  ADD CONSTRAINT "Project_version_check" CHECK ("version" > 0);

ALTER TABLE "ProjectMedia"
  ADD CONSTRAINT "ProjectMedia_dimensions_check" CHECK (("width" IS NULL OR "width" > 0) AND ("height" IS NULL OR "height" > 0)),
  ADD CONSTRAINT "ProjectMedia_duration_check" CHECK ("durationSeconds" IS NULL OR "durationSeconds" >= 0),
  ADD CONSTRAINT "ProjectMedia_path_check" CHECK ("sourceReference" IS NOT NULL OR "publicDeliveryPath" IS NOT NULL);

ALTER TABLE "Job"
  ADD CONSTRAINT "Job_slug_check" CHECK ("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  ADD CONSTRAINT "Job_compensation_check" CHECK (
    ("compensationMode" = 'HIDDEN' AND "compensationMinMinor" IS NULL AND "compensationMaxMinor" IS NULL AND "compensationCurrency" IS NULL AND "compensationPeriod" IS NULL AND "compensationText" IS NULL)
    OR
    ("compensationMode" = 'NUMERIC_RANGE' AND "compensationMinMinor" IS NOT NULL AND "compensationMaxMinor" IS NOT NULL AND "compensationCurrency" IS NOT NULL AND "compensationPeriod" IS NOT NULL AND "compensationText" IS NULL AND "compensationMinMinor" >= 0 AND "compensationMinMinor" <= "compensationMaxMinor")
    OR
    ("compensationMode" = 'APPROVED_TEXT' AND "compensationMinMinor" IS NULL AND "compensationMaxMinor" IS NULL AND "compensationCurrency" IS NULL AND "compensationPeriod" IS NULL AND "compensationText" IS NOT NULL)
  ),
  ADD CONSTRAINT "Job_schedule_check" CHECK ("applicationDeadline" IS NULL OR "publishAt" IS NULL OR "applicationDeadline" > "publishAt"),
  ADD CONSTRAINT "Job_version_check" CHECK ("version" > 0);

ALTER TABLE "JobQuestion"
  ADD CONSTRAINT "JobQuestion_sort_order_check" CHECK ("sortOrder" >= 0);

ALTER TABLE "JobQuestionOption"
  ADD CONSTRAINT "JobQuestionOption_sort_order_check" CHECK ("sortOrder" >= 0);

ALTER TABLE "RetentionPolicy"
  ADD CONSTRAINT "RetentionPolicy_duration_check" CHECK ("durationDays" > 0);

ALTER TABLE "Application"
  ADD CONSTRAINT "Application_type_context_check" CHECK (
    ("applicationType" = 'JOB_APPLICATION' AND "jobId" IS NOT NULL AND "engagementType" IS NULL)
    OR
    ("applicationType" = 'TALENT_NETWORK' AND "jobId" IS NULL AND "engagementType" IS NOT NULL)
  ),
  ADD CONSTRAINT "Application_freelance_rate_check" CHECK (
    ("freelancerRateMinMinor" IS NULL AND "freelancerRateMaxMinor" IS NULL AND "rateCurrency" IS NULL)
    OR
    ("engagementType" = 'FREELANCE_PROJECT' AND "freelancerRateMinMinor" IS NOT NULL AND "freelancerRateMaxMinor" IS NOT NULL AND "rateCurrency" IS NOT NULL AND "freelancerRateMinMinor" >= 0 AND "freelancerRateMinMinor" <= "freelancerRateMaxMinor")
  ),
  ADD CONSTRAINT "Application_hiring_state_check" CHECK (
    ("technicalStatus" = 'SUBMITTED' AND "hiringStatus" IS NOT NULL AND "submittedAt" IS NOT NULL)
    OR
    ("technicalStatus" = 'WITHDRAWN' AND ("hiringStatus" IS NULL OR "hiringStatus" = 'WITHDRAWN'))
    OR
    ("technicalStatus" NOT IN ('SUBMITTED', 'WITHDRAWN') AND "hiringStatus" IS NULL)
  ),
  ADD CONSTRAINT "Application_deletion_check" CHECK ("deletionCompletedAt" IS NULL OR "deletionRequestedAt" IS NOT NULL),
  ADD CONSTRAINT "Application_portfolio_url_check" CHECK ("portfolioUrl" IS NULL OR "portfolioUrl" ~ '^https?://'),
  ADD CONSTRAINT "Application_professional_url_check" CHECK ("professionalUrl" IS NULL OR "professionalUrl" ~ '^https?://');

ALTER TABLE "ApplicationAnswer"
  ADD CONSTRAINT "ApplicationAnswer_value_shape_check" CHECK (
    ("questionTypeSnapshot" IN ('SHORT_TEXT', 'LONG_TEXT') AND "answerText" IS NOT NULL AND "answerBoolean" IS NULL AND "selectedOptionLabelSnapshot" IS NULL)
    OR
    ("questionTypeSnapshot" = 'YES_NO' AND "answerText" IS NULL AND "answerBoolean" IS NOT NULL AND "selectedOptionLabelSnapshot" IS NULL)
    OR
    ("questionTypeSnapshot" = 'SELECT' AND "answerText" IS NULL AND "answerBoolean" IS NULL AND "selectedOptionLabelSnapshot" IS NOT NULL)
  );

ALTER TABLE "CandidateFile"
  ADD CONSTRAINT "CandidateFile_pdf_metadata_check" CHECK ("extension" = 'pdf' AND "storedFilename" ~ '^[a-f0-9-]+\\.pdf$' AND "sizeBytes" > 0 AND "sizeBytes" <= 5242880),
  ADD CONSTRAINT "CandidateFile_hash_check" CHECK ("contentHash" IS NULL OR "contentHash" ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT "CandidateFile_clearance_check" CHECK (
    ("securityStatus" = 'CLEARED' AND "validationStatus" = 'PASSED' AND "technicalStatus" = 'QUARANTINED' AND "contentHash" IS NOT NULL AND "clearanceMethod" IS NOT NULL AND "clearedAt" IS NOT NULL)
    OR
    ("securityStatus" <> 'CLEARED' AND "clearanceMethod" IS NULL AND "clearedAt" IS NULL)
  ),
  ADD CONSTRAINT "CandidateFile_validation_check" CHECK ("validationStatus" <> 'FAILED' OR "securityStatus" <> 'CLEARED'),
  ADD CONSTRAINT "CandidateFile_deletion_check" CHECK (
    ("technicalStatus" = 'DELETED' AND "deletedAt" IS NOT NULL AND "driveFileId" IS NULL)
    OR
    ("technicalStatus" <> 'DELETED' AND "deletedAt" IS NULL)
  ),
  ADD CONSTRAINT "CandidateFile_version_check" CHECK ("version" > 0);

ALTER TABLE "FileSecurityReview"
  ADD CONSTRAINT "FileSecurityReview_actor_check" CHECK (
    ("reviewerStaffUserId" IS NOT NULL AND "systemActorCode" IS NULL)
    OR
    ("reviewerStaffUserId" IS NULL AND "systemActorCode" IS NOT NULL)
  ),
  ADD CONSTRAINT "FileSecurityReview_hash_check" CHECK ("fileHashSnapshot" ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT "FileSecurityReview_time_check" CHECK ("completedAt" >= "startedAt");

ALTER TABLE "ApplicationStatusEvent"
  ADD CONSTRAINT "ApplicationStatusEvent_actor_check" CHECK (
    ("actorType" = 'STAFF' AND "actorStaffUserId" IS NOT NULL AND "systemActorCode" IS NULL)
    OR
    ("actorType" = 'SYSTEM' AND "actorStaffUserId" IS NULL AND "systemActorCode" IS NOT NULL)
  );

ALTER TABLE "AuditEvent"
  ADD CONSTRAINT "AuditEvent_actor_check" CHECK (
    ("actorType" = 'STAFF' AND "actorStaffUserId" IS NOT NULL)
    OR
    ("actorType" IN ('SYSTEM', 'ANONYMOUS') AND "actorStaffUserId" IS NULL)
  ),
  ADD CONSTRAINT "AuditEvent_safe_metadata_check" CHECK ("safeMetadata" IS NULL OR jsonb_typeof("safeMetadata") = 'object');

ALTER TABLE "BackgroundJob"
  ADD CONSTRAINT "BackgroundJob_subject_check" CHECK (NOT ("applicationId" IS NOT NULL AND "candidateFileId" IS NOT NULL)),
  ADD CONSTRAINT "BackgroundJob_attempts_check" CHECK ("attemptCount" >= 0 AND "maxAttempts" > 0 AND "attemptCount" <= "maxAttempts"),
  ADD CONSTRAINT "BackgroundJob_payload_check" CHECK ("safePayload" IS NULL OR jsonb_typeof("safePayload") = 'object'),
  ADD CONSTRAINT "BackgroundJob_state_check" CHECK (
    ("state" = 'QUEUED' AND "claimToken" IS NULL AND "leaseUntil" IS NULL AND "completedAt" IS NULL)
    OR
    ("state" = 'RUNNING' AND "claimToken" IS NOT NULL AND "claimedAt" IS NOT NULL AND "leaseUntil" IS NOT NULL AND "completedAt" IS NULL)
    OR
    ("state" IN ('SUCCEEDED', 'DEAD') AND "completedAt" IS NOT NULL)
  );

ALTER TABLE "IdempotencyRecord"
  ADD CONSTRAINT "IdempotencyRecord_key_hash_check" CHECK ("keyHash" ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT "IdempotencyRecord_request_hash_check" CHECK ("requestHash" ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT "IdempotencyRecord_expiry_check" CHECK ("expiresAt" > "createdAt");

ALTER TABLE "RateLimitBucket"
  ADD CONSTRAINT "RateLimitBucket_key_digest_check" CHECK ("keyDigest" ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT "RateLimitBucket_count_check" CHECK ("count" >= 0),
  ADD CONSTRAINT "RateLimitBucket_expiry_check" CHECK ("expiresAt" > "windowStartedAt");

CREATE UNIQUE INDEX "UserRole_one_active_role_per_user"
ON "UserRole" ("staffUserId", "roleCode")
WHERE "revokedAt" IS NULL;

CREATE UNIQUE INDEX "ConsentDefinition_one_active_version"
ON "ConsentDefinition" ("consentType")
WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "RetentionPolicy_one_active_version"
ON "RetentionPolicy" ("category")
WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "CandidateFile_one_active_file_per_application"
ON "CandidateFile" ("applicationId")
WHERE "technicalStatus" <> 'DELETED';

CREATE FUNCTION public.prevent_immutable_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "AuditEvent_append_only"
BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION public.prevent_immutable_change();

CREATE TRIGGER "ApplicationStatusEvent_append_only"
BEFORE UPDATE OR DELETE ON "ApplicationStatusEvent"
FOR EACH ROW EXECUTE FUNCTION public.prevent_immutable_change();

CREATE TRIGGER "FileSecurityReview_append_only"
BEFORE UPDATE OR DELETE ON "FileSecurityReview"
FOR EACH ROW EXECUTE FUNCTION public.prevent_immutable_change();

CREATE TRIGGER "CandidateConsent_append_only"
BEFORE UPDATE OR DELETE ON "CandidateConsent"
FOR EACH ROW EXECUTE FUNCTION public.prevent_immutable_change();

CREATE FUNCTION public.protect_versioned_policy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION '% versions cannot be deleted', TG_TABLE_NAME USING ERRCODE = '55000';
  END IF;

  IF to_jsonb(NEW) - 'status' <> to_jsonb(OLD) - 'status' THEN
    RAISE EXCEPTION '% version content is immutable', TG_TABLE_NAME USING ERRCODE = '55000';
  END IF;

  IF OLD."status" = 'RETIRED' OR (OLD."status" = 'ACTIVE' AND NEW."status" <> 'RETIRED') OR (OLD."status" = 'DRAFT' AND NEW."status" NOT IN ('ACTIVE', 'RETIRED')) THEN
    RAISE EXCEPTION 'invalid % status transition', TG_TABLE_NAME USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "ConsentDefinition_version_immutable"
BEFORE UPDATE OR DELETE ON "ConsentDefinition"
FOR EACH ROW EXECUTE FUNCTION public.protect_versioned_policy();

CREATE TRIGGER "RetentionPolicy_version_immutable"
BEFORE UPDATE OR DELETE ON "RetentionPolicy"
FOR EACH ROW EXECUTE FUNCTION public.protect_versioned_policy();

CREATE FUNCTION public.protect_used_job_question()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public."ApplicationAnswer" WHERE "jobQuestionId" = OLD."id") THEN
    RAISE EXCEPTION 'used job questions are immutable' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "JobQuestion_used_immutable"
BEFORE UPDATE OR DELETE ON "JobQuestion"
FOR EACH ROW EXECUTE FUNCTION public.protect_used_job_question();

CREATE FUNCTION public.protect_used_job_question_option()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public."ApplicationAnswer" WHERE "jobQuestionId" = OLD."jobQuestionId") THEN
    RAISE EXCEPTION 'options for used job questions are immutable' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "JobQuestionOption_used_immutable"
BEFORE UPDATE OR DELETE ON "JobQuestionOption"
FOR EACH ROW EXECUTE FUNCTION public.protect_used_job_question_option();

CREATE FUNCTION public.enforce_application_insert_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW."applicationType" = 'JOB_APPLICATION' AND NOT EXISTS (
    SELECT 1
    FROM public."Job"
    WHERE "id" = NEW."jobId"
      AND "lifecycleState" = 'PUBLISHED'
      AND ("publishAt" IS NULL OR "publishAt" <= CURRENT_TIMESTAMP)
      AND ("applicationDeadline" IS NULL OR CURRENT_TIMESTAMP < "applicationDeadline")
      AND "closedAt" IS NULL
  ) THEN
    RAISE EXCEPTION 'job is not accepting applications' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Application_effective_job_gate"
BEFORE INSERT ON "Application"
FOR EACH ROW EXECUTE FUNCTION public.enforce_application_insert_context();

CREATE FUNCTION public.protect_application_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW."applicationType" IS DISTINCT FROM OLD."applicationType"
    OR NEW."jobId" IS DISTINCT FROM OLD."jobId"
    OR NEW."engagementType" IS DISTINCT FROM OLD."engagementType" THEN
    RAISE EXCEPTION 'application context is immutable' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Application_context_immutable"
BEFORE UPDATE ON "Application"
FOR EACH ROW EXECUTE FUNCTION public.protect_application_context();

CREATE FUNCTION public.protect_published_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF OLD."slug" IS DISTINCT FROM NEW."slug" AND OLD."publishedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'published slugs are immutable' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Project_published_slug_immutable"
BEFORE UPDATE ON "Project"
FOR EACH ROW EXECUTE FUNCTION public.protect_published_slug();

CREATE TRIGGER "Job_published_slug_immutable"
BEFORE UPDATE ON "Job"
FOR EACH ROW EXECUTE FUNCTION public.protect_published_slug();

-- Supabase public roles have no direct access. The application is server-mediated.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  table_record record;
BEGIN
  FOR table_record IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.tablename);
  END LOOP;
END;
$$;
