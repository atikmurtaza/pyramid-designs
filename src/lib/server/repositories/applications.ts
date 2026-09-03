import "server-only";

import { randomUUID } from "node:crypto";

import { transaction, type DatabaseExecutor } from "../database.ts";
import { appendAuditEvent } from "./audit.ts";

export type TalentEngagementType =
  | "PERMANENT_INTEREST"
  | "FREELANCE_PROJECT"
  | "INTERNSHIP_EARLY_CAREER"
  | "PORTFOLIO_INTRODUCTION";

export type HiringStatus =
  | "NEW"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "OFFER"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN";

interface ApplicationSnapshot {
  fullName: string;
  email: string;
  city: string;
  phoneOrWhatsApp?: string;
  experienceLevel: string;
  specialism?: string;
  portfolioUrl?: string;
  professionalUrl?: string;
  availabilityText?: string;
  remoteAvailable?: boolean;
  shortIntroduction?: string;
  preferredEngagement?: string;
  freelancerRateMinMinor?: bigint;
  freelancerRateMaxMinor?: bigint;
  rateCurrency?: string;
  accommodationContactRequested?: boolean;
  source: string;
  safeCampaignCode?: string;
}

interface JobApplicationContext {
  applicationType: "JOB_APPLICATION";
  jobId: string;
  departmentId?: never;
  engagementType?: never;
}

interface TalentNetworkContext {
  applicationType: "TALENT_NETWORK";
  jobId?: never;
  departmentId: string;
  engagementType: TalentEngagementType;
}

export type CreateApplicationInput = ApplicationSnapshot &
  (JobApplicationContext | TalentNetworkContext) & {
    consentDefinitionId: string;
    retentionPolicyId: string;
    requestId: string;
    idempotencyKeyHash: string;
    requestHash: string;
    idempotencyExpiresAt: Date;
    answers?: Array<{ jobQuestionId: string; value: string | boolean }>;
  };

export interface ApplicationRecord {
  id: string;
  publicReference: string;
  applicationType: "JOB_APPLICATION" | "TALENT_NETWORK";
  jobId: string | null;
  technicalStatus: "SUBMISSION_PENDING" | "SECURITY_PENDING" | "SUBMITTED" | "FAILED" | "WITHDRAWN";
  hiringStatus: HiringStatus | null;
  expiresAt: Date;
  createdAt: Date;
}

type ApplicationRow = ApplicationRecord;

interface JobContextRow {
  departmentId: string;
}

interface RetentionPolicyRow {
  durationDays: number;
}

interface JobQuestionRow {
  id: string;
  questionType: "SHORT_TEXT" | "LONG_TEXT" | "SELECT" | "YES_NO";
  prompt: string;
  required: boolean;
  options: string[];
}

const hiringTransitions: Readonly<Record<HiringStatus, readonly HiringStatus[]>> = {
  NEW: ["UNDER_REVIEW", "REJECTED", "WITHDRAWN"],
  UNDER_REVIEW: ["SHORTLISTED", "INTERVIEW", "REJECTED", "WITHDRAWN"],
  SHORTLISTED: ["INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"],
  INTERVIEW: ["OFFER", "REJECTED", "WITHDRAWN"],
  OFFER: ["HIRED", "REJECTED", "WITHDRAWN"],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

function publicReference() {
  return `PD-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
}

async function loadJobQuestions(executor: DatabaseExecutor, jobId: string) {
  const result = await executor.query<JobQuestionRow>(
    `SELECT question."id", question."questionType", question."prompt", question."required",
            COALESCE(array_agg(option."label" ORDER BY option."sortOrder")
              FILTER (WHERE option."id" IS NOT NULL), ARRAY[]::varchar[]) AS "options"
     FROM public."JobQuestion" question
     LEFT JOIN public."JobQuestionOption" option ON option."jobQuestionId" = question."id"
     WHERE question."jobId" = $1 AND question."active" = true
     GROUP BY question."id"
     ORDER BY question."sortOrder", question."id"`,
    [jobId],
  );
  return result.rows;
}

async function insertAnswers(
  executor: DatabaseExecutor,
  applicationId: string,
  questions: JobQuestionRow[],
  suppliedAnswers: CreateApplicationInput["answers"],
) {
  const answers = new Map(suppliedAnswers?.map((answer) => [answer.jobQuestionId, answer]));
  if (answers.size !== (suppliedAnswers?.length ?? 0)) {
    throw new Error("Duplicate application answer.");
  }

  const questionIds = new Set(questions.map((question) => question.id));
  if ([...answers.keys()].some((id) => !questionIds.has(id))) {
    throw new Error("Application answer does not belong to the job.");
  }

  for (const question of questions) {
    const answer = answers.get(question.id);
    if (!answer) {
      if (question.required) throw new Error("A required application answer is missing.");
      continue;
    }

    const answerText =
      question.questionType === "SHORT_TEXT" || question.questionType === "LONG_TEXT"
        ? String(answer.value)
        : null;
    const answerBoolean = question.questionType === "YES_NO" ? answer.value : null;
    const selectedOption = question.questionType === "SELECT" ? String(answer.value) : null;

    if (question.questionType === "YES_NO" && typeof answer.value !== "boolean") {
      throw new Error("Yes/no application answer is invalid.");
    }
    if (question.questionType === "SELECT" && !question.options.includes(selectedOption ?? "")) {
      throw new Error("Selected application answer is invalid.");
    }

    await executor.query(
      `INSERT INTO public."ApplicationAnswer" (
         "id", "applicationId", "jobQuestionId", "questionTextSnapshot",
         "questionTypeSnapshot", "answerText", "answerBoolean", "selectedOptionLabelSnapshot"
       ) VALUES ($1, $2, $3, $4, $5::"QuestionType", $6, $7, $8)`,
      [
        randomUUID(),
        applicationId,
        question.id,
        question.prompt,
        question.questionType,
        answerText,
        answerBoolean,
        selectedOption,
      ],
    );
  }
}

export async function createApplication(input: CreateApplicationInput): Promise<ApplicationRecord> {
  return transaction(async (executor) => {
    const idempotencyId = randomUUID();
    const reserved = await executor.query(
      `INSERT INTO public."IdempotencyRecord" (
         "id", "scope", "keyHash", "requestHash", "state", "expiresAt"
       ) VALUES ($1, 'APPLICATION_SUBMISSION', $2, $3, 'IN_PROGRESS', $4)
       ON CONFLICT ("scope", "keyHash") DO NOTHING`,
      [idempotencyId, input.idempotencyKeyHash, input.requestHash, input.idempotencyExpiresAt],
    );

    if (reserved.rowCount === 0) {
      const existing = await executor.query<{
        requestHash: string;
        state: "IN_PROGRESS" | "COMPLETED" | "FAILED";
        resultReference: string | null;
      }>(
        `SELECT "requestHash", "state", "resultReference"
         FROM public."IdempotencyRecord"
         WHERE "scope" = 'APPLICATION_SUBMISSION' AND "keyHash" = $1
         FOR UPDATE`,
        [input.idempotencyKeyHash],
      );
      const record = existing.rows[0];
      if (!record || record.requestHash !== input.requestHash) {
        throw new Error("Idempotency key conflicts with another request.");
      }
      if (record.state === "COMPLETED" && record.resultReference) {
        const application = await executor.query<ApplicationRow>(
          `SELECT "id", "publicReference", "applicationType", "jobId", "technicalStatus", "hiringStatus", "expiresAt", "createdAt"
           FROM public."Application" WHERE "id" = $1`,
          [record.resultReference],
        );
        if (application.rows[0]) return { ...application.rows[0] };
      }
      throw new Error("Application request is already in progress.");
    }

    const retention = await executor.query<RetentionPolicyRow>(
      `SELECT "durationDays"
       FROM public."RetentionPolicy"
       WHERE "id" = $1 AND "status" = 'ACTIVE' AND "effectiveFrom" <= CURRENT_TIMESTAMP
       FOR SHARE`,
      [input.retentionPolicyId],
    );
    if (!retention.rows[0]) throw new Error("Retention policy is unavailable.");

    const consent = await executor.query(
      `SELECT "id"
       FROM public."ConsentDefinition"
       WHERE "id" = $1 AND "status" = 'ACTIVE' AND "effectiveFrom" <= CURRENT_TIMESTAMP
       FOR SHARE`,
      [input.consentDefinitionId],
    );
    if (!consent.rows[0]) throw new Error("Consent definition is unavailable.");

    let departmentId: string;
    let questions: JobQuestionRow[] = [];
    if (input.applicationType === "JOB_APPLICATION") {
      const job = await executor.query<JobContextRow>(
        `SELECT "departmentId"
         FROM public."Job"
         WHERE "id" = $1
           AND "lifecycleState" = 'PUBLISHED'
           AND ("publishAt" IS NULL OR "publishAt" <= CURRENT_TIMESTAMP)
           AND ("applicationDeadline" IS NULL OR CURRENT_TIMESTAMP < "applicationDeadline")
           AND "closedAt" IS NULL
         FOR SHARE`,
        [input.jobId],
      );
      if (!job.rows[0]) throw new Error("Job is not accepting applications.");
      departmentId = job.rows[0].departmentId;
      questions = await loadJobQuestions(executor, input.jobId);
    } else {
      departmentId = input.departmentId;
      if (input.answers?.length) throw new Error("Talent-network answers cannot reference job questions.");
    }

    const applicationId = randomUUID();
    const expiresAt = new Date(Date.now() + retention.rows[0].durationDays * 86_400_000);
    const inserted = await executor.query<ApplicationRow>(
      `INSERT INTO public."Application" (
         "id", "publicReference", "applicationType", "jobId", "fullName", "email", "city",
         "phoneOrWhatsApp", "departmentId", "experienceLevel", "specialism", "portfolioUrl",
         "professionalUrl", "availabilityText", "remoteAvailable", "shortIntroduction",
         "engagementType", "preferredEngagement", "freelancerRateMinMinor",
         "freelancerRateMaxMinor", "rateCurrency", "accommodationContactRequested", "source",
         "safeCampaignCode", "retentionPolicyId", "expiresAt", "updatedAt"
       ) VALUES (
         $1, $2, $3::"ApplicationType", $4, $5, $6, $7, $8, $9, $10, $11, $12,
         $13, $14, $15, $16, $17::"TalentEngagementType", $18, $19, $20, $21, $22,
         $23, $24, $25, $26, CURRENT_TIMESTAMP
       )
       RETURNING "id", "publicReference", "applicationType", "jobId", "technicalStatus", "hiringStatus", "expiresAt", "createdAt"`,
      [
        applicationId,
        publicReference(),
        input.applicationType,
        input.applicationType === "JOB_APPLICATION" ? input.jobId : null,
        input.fullName,
        input.email,
        input.city,
        input.phoneOrWhatsApp ?? null,
        departmentId,
        input.experienceLevel,
        input.specialism ?? null,
        input.portfolioUrl ?? null,
        input.professionalUrl ?? null,
        input.availabilityText ?? null,
        input.remoteAvailable ?? null,
        input.shortIntroduction ?? null,
        input.applicationType === "TALENT_NETWORK" ? input.engagementType : null,
        input.preferredEngagement ?? null,
        input.freelancerRateMinMinor ?? null,
        input.freelancerRateMaxMinor ?? null,
        input.rateCurrency ?? null,
        input.accommodationContactRequested ?? false,
        input.source,
        input.safeCampaignCode ?? null,
        input.retentionPolicyId,
        expiresAt,
      ],
    );

    await executor.query(
      `INSERT INTO public."CandidateConsent" (
         "id", "applicationId", "consentDefinitionId", "decision", "source", "requestId"
       ) VALUES ($1, $2, $3, 'ACCEPTED', $4::"ConsentSource", $5)`,
      [
        randomUUID(),
        applicationId,
        input.consentDefinitionId,
        input.applicationType === "JOB_APPLICATION" ? "JOB_FORM" : "TALENT_FORM",
        input.requestId,
      ],
    );
    await insertAnswers(executor, applicationId, questions, input.answers);
    await executor.query(
      `UPDATE public."IdempotencyRecord"
       SET "state" = 'COMPLETED', "resultReference" = $2
       WHERE "id" = $1`,
      [idempotencyId, applicationId],
    );
    return { ...inserted.rows[0] };
  });
}

async function changeHiringStatusWithExecutor(executor: DatabaseExecutor, input: {
  applicationId: string;
  actorStaffUserId: string;
  toStatus: HiringStatus;
  reasonCode: string;
  summary?: string;
  correlationId: string;
}) {
  const actor = await executor.query(
      `SELECT "id" FROM public."StaffUser" WHERE "id" = $1 AND "status" = 'ACTIVE' FOR SHARE`,
      [input.actorStaffUserId],
    );
    if (!actor.rows[0]) throw new Error("Staff actor is unavailable.");

    const current = await executor.query<{
      technicalStatus: string;
      hiringStatus: HiringStatus | null;
    }>(
      `SELECT "technicalStatus", "hiringStatus"
       FROM public."Application"
       WHERE "id" = $1
       FOR UPDATE`,
      [input.applicationId],
    );
    const application = current.rows[0];
    if (!application || application.technicalStatus !== "SUBMITTED" || !application.hiringStatus) {
      throw new Error("Application is unavailable for hiring review.");
    }
    if (!hiringTransitions[application.hiringStatus].includes(input.toStatus)) {
      throw new Error("Hiring status transition is invalid.");
    }

    await executor.query(
      `UPDATE public."Application"
       SET "hiringStatus" = $2::"HiringStatus",
           "technicalStatus" = CASE WHEN $2 = 'WITHDRAWN' THEN 'WITHDRAWN'::"ApplicationTechnicalStatus" ELSE "technicalStatus" END,
           "withdrawnAt" = CASE WHEN $2 = 'WITHDRAWN' THEN CURRENT_TIMESTAMP ELSE "withdrawnAt" END,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1`,
      [input.applicationId, input.toStatus],
    );
    await executor.query(
      `INSERT INTO public."ApplicationStatusEvent" (
         "id", "applicationId", "fromStatus", "toStatus", "actorType",
         "actorStaffUserId", "reasonCode", "summary"
       ) VALUES ($1, $2, $3::"HiringStatus", $4::"HiringStatus", 'STAFF', $5, $6, $7)`,
      [
        randomUUID(),
        input.applicationId,
        application.hiringStatus,
        input.toStatus,
        input.actorStaffUserId,
        input.reasonCode,
        input.summary ?? null,
      ],
    );
    await appendAuditEvent(
      {
        actorType: "STAFF",
        actorStaffUserId: input.actorStaffUserId,
        actionCode: "APPLICATION_HIRING_STATUS_CHANGED",
        targetType: "APPLICATION",
        targetId: input.applicationId,
        outcome: "SUCCEEDED",
        reasonCode: input.reasonCode,
        correlationId: input.correlationId,
        safeMetadata: { fromStatus: application.hiringStatus, toStatus: input.toStatus },
      },
      executor,
    );
  return input.toStatus;
}

export async function changeHiringStatus(
  input: Parameters<typeof changeHiringStatusWithExecutor>[1],
  executor?: DatabaseExecutor,
) {
  if (executor) return changeHiringStatusWithExecutor(executor, input);
  return transaction((transactionExecutor) =>
    changeHiringStatusWithExecutor(transactionExecutor, input),
  );
}
