import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { database, transaction, type DatabaseExecutor } from "./database.ts";
import { hasSameOriginMutation } from "./auth/csrf.ts";
import { createFileFreeApplication, createFileRequiredApplication, type CreateApplicationInput, type TalentEngagementType } from "./repositories/applications.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const engagements = ["PERMANENT_INTEREST", "FREELANCE_PROJECT", "INTERNSHIP_EARLY_CAREER", "PORTFOLIO_INTRODUCTION"] as const;
const fields = ["applicationType", "jobId", "departmentId", "engagementType", "fullName", "email", "city", "phoneOrWhatsApp", "experienceLevel", "portfolioUrl", "professionalUrl", "shortIntroduction", "consentDefinitionId", "consent", "idempotencyKey"];
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const maxBodyBytes = 24_576;

export class IntakeValidationError extends Error {
  field: string;
  constructor(field: string) { super("Check this field."); this.field = field; }
}
function invalid(field: string): never { throw new IntakeValidationError(field); }
function publicField(field: string) {
  return ["fullName", "email", "city", "phoneOrWhatsApp", "experienceLevel", "portfolioUrl", "professionalUrl", "shortIntroduction", "departmentId", "engagementType", "consent"].includes(field)
    || field.startsWith("answer.") ? field : "form";
}

export interface IntakeQuestion {
  id: string; prompt: string; questionType: "SHORT_TEXT" | "LONG_TEXT" | "SELECT" | "YES_NO";
  required: boolean; options: Array<{ id: string; label: string }>;
}
export interface IntakeContext {
  jobs: Array<{ id: string; slug: string; title: string }>;
  departments: Array<{ id: string; name: string }>;
  consent: { id: string; contentText: string };
  questions: IntakeQuestion[];
}

// Closed by default, including production. Only explicit loopback synthetic review is enabled.
export function syntheticIntakeEnabled(origin: string) {
  try {
    const url = new URL(origin);
    return ["development", "test"].includes(process.env.NODE_ENV ?? "")
      && process.env.PUBLIC_INTAKE_MODE === "synthetic"
      && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      && ["http:", "https:"].includes(url.protocol);
  } catch { return false; }
}

export function intakeRequestAllowed(request: Request) {
  const target = new URL(request.url);
  const effectiveOrigin = request.headers.get("host") ? `${target.protocol}//${request.headers.get("host")}` : target.origin;
  const localAlias = syntheticIntakeEnabled(request.url) && syntheticIntakeEnabled(effectiveOrigin)
    && new URL(effectiveOrigin).port === target.port && request.headers.get("origin") === effectiveOrigin;
  return (hasSameOriginMutation(request) || localAlias) && syntheticIntakeEnabled(request.url)
    && syntheticIntakeEnabled(effectiveOrigin) && request.headers.get("origin") === effectiveOrigin
    && request.headers.get("sec-fetch-site") !== "cross-site";
}

async function policies(executor: DatabaseExecutor) {
  const consent = await executor.query<{ id: string; contentText: string }>(`SELECT "id", "contentText" FROM public."ConsentDefinition"
    WHERE "consentType" = 'SYNTHETIC_APPLICATION_PROCESSING' AND "status" = 'ACTIVE'
    AND "effectiveFrom" <= clock_timestamp() ORDER BY "effectiveFrom" DESC, "id" LIMIT 1 FOR SHARE`);
  const retention = await executor.query<{ id: string }>(`SELECT "id" FROM public."RetentionPolicy"
    WHERE "category" = 'SYNTHETIC_JOB_APPLICATION' AND "status" = 'ACTIVE'
    AND "effectiveFrom" <= clock_timestamp() ORDER BY "effectiveFrom" DESC, "id" LIMIT 1 FOR SHARE`);
  if (!consent.rows[0] || !retention.rows[0]) throw new Error("Intake unavailable.");
  // Synthetic verification policy only; purpose-specific approved versions gate real intake.
  return { consent: consent.rows[0], retentionPolicyId: retention.rows[0].id };
}

export async function getIntakeContext(jobId?: string, executor: DatabaseExecutor = database): Promise<IntakeContext> {
  if (jobId && !uuid.test(jobId)) invalid("jobId");
  const { consent } = await policies(executor);
  const jobs = await executor.query<IntakeContext["jobs"][number]>(`SELECT "id", "slug", "title" FROM public."Job"
    WHERE "lifecycleState" = 'PUBLISHED' AND "closedAt" IS NULL
    AND ("publishAt" IS NULL OR "publishAt" <= clock_timestamp())
    AND ("applicationDeadline" IS NULL OR clock_timestamp() < "applicationDeadline")
    AND "slug" LIKE 'synthetic-%' ORDER BY "title", "id" LIMIT 50`);
  if (jobId && !jobs.rows.some((job) => job.id === jobId)) invalid("jobId");
  const departments = await executor.query<IntakeContext["departments"][number]>(`SELECT "id", "name" FROM public."Department"
    WHERE "active" = true AND "code" LIKE 'SYNTHETIC_%' ORDER BY "sortOrder", "id" LIMIT 50`);
  const questions = jobId ? await executor.query<IntakeQuestion>(`SELECT q."id", q."prompt", q."questionType", q."required",
    COALESCE(jsonb_agg(jsonb_build_object('id', o."id", 'label', o."label") ORDER BY o."sortOrder")
      FILTER (WHERE o."id" IS NOT NULL), '[]'::jsonb) AS "options"
    FROM public."JobQuestion" q LEFT JOIN public."JobQuestionOption" o ON o."jobQuestionId" = q."id"
    WHERE q."jobId" = $1 AND q."active" = true GROUP BY q."id" ORDER BY q."sortOrder" LIMIT 51`, [jobId]) : { rows: [] };
  if (questions.rows.length > 50) throw new Error("Intake unavailable.");
  return { jobs: jobs.rows, departments: departments.rows, consent, questions: questions.rows };
}

export function validateIntake(data: URLSearchParams) {
  const seen = new Set<string>();
  for (const [key] of data) {
    if (seen.has(key) || (!fields.includes(key) && !/^answer\.[0-9a-f-]{36}$/i.test(key))) invalid("form");
    seen.add(key);
  }
  if (seen.size > fields.length + 50) invalid("form");
  const text = (field: string, max: number, required = true) => {
    const raw = data.get(field);
    if (raw !== null && (raw.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(raw))) invalid(field);
    const value = raw?.trim() ?? "";
    if (required && !value) invalid(field);
    return value;
  };
  const id = (field: string) => { const value = text(field, 36); if (!uuid.test(value)) invalid(field); return value.toLowerCase(); };
  const applicationType = text("applicationType", 30);
  if (applicationType !== "JOB_APPLICATION" && applicationType !== "TALENT_NETWORK") invalid("applicationType");
  const fullName = text("fullName", 160);
  const email = text("email", 320).toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) invalid("email");
  // This phase does not authorize real candidate intake.
  if (!fullName.startsWith("Synthetic ")) invalid("fullName");
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@example\.invalid$/.test(email)) invalid("email");
  const url = (field: string) => {
    const value = text(field, 500, false);
    if (!value) return undefined;
    try { const parsed = new URL(value); if (parsed.protocol !== "https:" || parsed.username || parsed.password) invalid(field); }
    catch { invalid(field); }
    return value;
  };
  const snapshot = {
    fullName, email, city: text("city", 120), experienceLevel: text("experienceLevel", 40),
    phoneOrWhatsApp: text("phoneOrWhatsApp", 40, false) || undefined,
    portfolioUrl: url("portfolioUrl"), professionalUrl: url("professionalUrl"),
    shortIntroduction: text("shortIntroduction", 2000, false) || undefined,
  };
  if (snapshot.phoneOrWhatsApp && !/^[+()\d .-]{3,40}$/.test(snapshot.phoneOrWhatsApp)) invalid("phoneOrWhatsApp");
  if (data.get("consent") !== "accepted") invalid("consent");
  const consentDefinitionId = id("consentDefinitionId");
  const idempotencyKey = id("idempotencyKey");
  const answers = [...data.entries()].filter(([key]) => key.startsWith("answer.")).map(([key]) => {
    const questionId = key.slice(7).toLowerCase();
    if (!uuid.test(questionId)) invalid("form");
    return { questionId, value: text(key, 4000, false) };
  }).sort((a, b) => a.questionId.localeCompare(b.questionId));
  if (new Set(answers.map((answer) => answer.questionId)).size !== answers.length) invalid("form");
  const context = applicationType === "JOB_APPLICATION"
    ? { applicationType, jobId: id("jobId") } as const
    : { applicationType, departmentId: id("departmentId"), engagementType: text("engagementType", 40) as TalentEngagementType } as const;
  if (context.applicationType === "JOB_APPLICATION") {
    if (data.has("departmentId") || data.has("engagementType")) invalid("form");
  } else {
    if (data.has("jobId") || answers.length) invalid("form");
    if (!engagements.includes(context.engagementType)) invalid("engagementType");
    if (context.engagementType === "PORTFOLIO_INTRODUCTION" && !snapshot.portfolioUrl && !snapshot.professionalUrl) invalid("portfolioUrl");
  }
  return { ...snapshot, ...context, consentDefinitionId, idempotencyKey, answers };
}

export async function submitIntake(data: URLSearchParams, executor: DatabaseExecutor, fileDigest?: string) {
  const input = validateIntake(data);
  if (fileDigest !== undefined && !/^[a-f0-9]{64}$/.test(fileDigest)) invalid("form");
  const requestHash = digest(JSON.stringify(fileDigest ? { input, fileDigest } : input));
  const keyHash = digest(`public-intake:${input.idempotencyKey}`);
  const retry = await executor.query<{ requestHash: string; state: string; expiresAt: Date; resultReference: string | null }>(
    `SELECT "requestHash", "state", "expiresAt", "resultReference" FROM public."IdempotencyRecord"
     WHERE "scope" = 'APPLICATION_SUBMISSION' AND "keyHash" = $1 FOR UPDATE`, [keyHash]);
  if (retry.rows[0]) {
    const record = retry.rows[0];
    if (record.requestHash !== requestHash || record.state !== "COMPLETED" || record.expiresAt.getTime() <= Date.now()) invalid("form");
    const result = await executor.query<Awaited<ReturnType<typeof createFileFreeApplication>>>(`SELECT "id", "publicReference", "applicationType", "jobId", "technicalStatus", "hiringStatus", "expiresAt", "createdAt"
      FROM public."Application" WHERE "id" = $1`, [record.resultReference]);
    if (!result.rows[0]) invalid("form");
    return result.rows[0];
  }
  if (input.applicationType === "JOB_APPLICATION") {
    await executor.query(`SELECT "id" FROM public."Job" WHERE "id" = $1 FOR UPDATE`, [input.jobId]);
    await executor.query(`SELECT "id" FROM public."JobQuestion" WHERE "jobId" = $1 FOR UPDATE`, [input.jobId]);
  }
  const context = await getIntakeContext(input.applicationType === "JOB_APPLICATION" ? input.jobId : undefined, executor);
  if (input.consentDefinitionId !== context.consent.id) invalid("consent");
  if (input.applicationType === "TALENT_NETWORK" && !context.departments.some((department) => department.id === input.departmentId)) invalid("departmentId");
  const questions = new Map(context.questions.map((question) => [question.id, question]));
  const answers: NonNullable<CreateApplicationInput["answers"]> = [];
  for (const answer of input.answers) {
    const question = questions.get(answer.questionId);
    if (!question) invalid("form");
    if (!answer.value && !question.required) continue;
    const field = `answer.${question.id}`;
    if (!answer.value) invalid(field);
    if (question.questionType === "SELECT") {
      if (!uuid.test(answer.value) || !question.options.some((option) => option.id === answer.value)) invalid(field);
      answers.push({ jobQuestionId: question.id, optionId: answer.value, value: "" });
    } else if (question.questionType === "YES_NO") {
      if (!["yes", "no"].includes(answer.value)) invalid(field);
      answers.push({ jobQuestionId: question.id, value: answer.value === "yes" });
    } else {
      if (answer.value.length > (question.questionType === "SHORT_TEXT" ? 500 : 4000)) invalid(field);
      answers.push({ jobQuestionId: question.id, value: answer.value });
    }
  }
  for (const question of questions.values()) if (question.required && !answers.some((answer) => answer.jobQuestionId === question.id)) invalid(`answer.${question.id}`);
  const policy = await policies(executor);
  const { idempotencyKey: _idempotencyKey, ...snapshot } = input;
  void _idempotencyKey;
  return (fileDigest ? createFileRequiredApplication : createFileFreeApplication)({
    ...snapshot, answers, source: "SYNTHETIC_PUBLIC_INTAKE", requestId: randomUUID(),
    retentionPolicyId: policy.retentionPolicyId, idempotencyKeyHash: keyHash,
    requestHash, idempotencyExpiresAt: new Date(Date.now() + 86_400_000),
  }, executor);
}

export async function consumeIntakeLimit(executor?: DatabaseExecutor, now = Date.now()): Promise<boolean> {
  if (!executor) return transaction(async (limitedExecutor) => {
    await limitedExecutor.query(`SET LOCAL statement_timeout = '3s'`);
    return consumeIntakeLimit(limitedExecutor, now);
  });
  // Global budget deliberately avoids unproven proxy/IP headers and candidate identifiers.
  // One rolling row bounds storage without a scheduler. Hot-row contention limits throughput.
  const keyDigest = digest("public-intake-global");
  return (await executor.query<{ count: number }>(`INSERT INTO public."RateLimitBucket"
    ("id", "scope", "keyDigest", "windowStartedAt", "count", "expiresAt")
    VALUES ($1, 'PUBLIC_INTAKE_GLOBAL', $2, to_timestamp(0), 1, $3)
    ON CONFLICT ("scope", "keyDigest", "windowStartedAt") DO UPDATE
    SET "count" = CASE WHEN public."RateLimitBucket"."expiresAt" <= $4 THEN 1
      ELSE LEAST(public."RateLimitBucket"."count", 20) + 1 END,
      "expiresAt" = CASE WHEN public."RateLimitBucket"."expiresAt" <= $4 THEN $3 ELSE public."RateLimitBucket"."expiresAt" END
    RETURNING "count"`, [randomUUID(), keyDigest, new Date(now + 60_000), new Date(now)])).rows[0]?.count <= 20;
}

export async function handleIntakeRequest(request: Request, dependencies = { transaction, consumeLimit: consumeIntakeLimit }) {
  const response = (status: number, body: object) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
  // Next's local server can canonicalize 127.0.0.1 to localhost in Request.url.
  // Validate the actual Host and exact Origin, never forwarded host/IP headers.
  if (!intakeRequestAllowed(request)) return response(403, { ok: false, message: "Submission is unavailable." });
  try {
    if (!(await dependencies.consumeLimit())) return response(429, { ok: false, message: "Please wait a minute before retrying." });
    if (!/^application\/x-www-form-urlencoded(?:;\s*charset=utf-8)?$/i.test(request.headers.get("content-type") ?? "")) return response(415, { ok: false, message: "Submission is unavailable." });
    const declared = request.headers.get("content-length");
    if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBodyBytes)) return response(413, { ok: false, message: "The submission is too large." });
    const reader = request.body?.getReader();
    if (!reader) return response(400, { ok: false, message: "Check the form." });
    const chunks: Uint8Array[] = []; let size = 0;
    const deadline = setTimeout(() => { void reader.cancel(); }, 5000);
    const started = Date.now();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (Date.now() - started >= 5000) throw new Error("Read timeout.");
        if (done) break;
        size += value.byteLength;
        if (size > maxBodyBytes) { await reader.cancel(); return response(413, { ok: false, message: "The submission is too large." }); }
        chunks.push(value);
      }
    } finally { clearTimeout(deadline); reader.releaseLock(); }
    const data = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
    validateIntake(data);
    // Keep domain failures inside this callback so the existing transaction helper remains generic.
    let field: string | undefined;
    try {
      await dependencies.transaction(async (executor) => {
        await executor.query(`SET LOCAL statement_timeout = '8s'`);
        await executor.query(`SET LOCAL lock_timeout = '3s'`);
        try { return await submitIntake(data, executor); }
        catch (error) { if (error instanceof IntakeValidationError) field = error.field; throw error; }
      });
    } catch { if (field) return response(400, { ok: false, field: publicField(field), message: "Check this field and the current form details." }); throw new Error("Unavailable."); }
    return response(200, { ok: true, message: "Synthetic application received. No CV or file was submitted." });
  } catch (error) {
    if (error instanceof IntakeValidationError) return response(400, { ok: false, field: publicField(error.field), message: "Check this field and use synthetic information only." });
    return response(503, { ok: false, message: "Submission could not be completed. Retry with the same form, or reload if its details have changed." });
  }
}
