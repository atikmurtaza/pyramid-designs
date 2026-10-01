import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import pg from "pg";
import { syntheticPdf } from "./phase-2h-synthetic-pdf.mjs";
import { syntheticEmailAdapter } from "./synthetic-email-adapter.mjs";
import { authorizeRemoteVerifier } from "./neon-rehearsal-target.mjs";

assert(!existsSync(".env.local"));
assert.equal(Number(process.versions.node.split(".")[0]), 22);
const remoteMode = process.argv.includes("--neon-disposable");
if (remoteMode) process.on("uncaughtException", () => {
  console.error("NEON_DISPOSABLE_VERIFIER_FAILED details_suppressed=true"); process.exit(1);
});
const administratorRoles = remoteMode ? await authorizeRemoteVerifier("b1") : ["postgres"];
const runtimeUrl = new URL(process.env.DATABASE_URL ?? "invalid:");
const ownerUrl = new URL(process.env.B1_TEST_OWNER_URL ?? "invalid:");
if (!remoteMode) for (const url of [runtimeUrl, ownerUrl]) {
  assert(["localhost", "127.0.0.1"].includes(url.hostname));
  assert(/^\/phase2ib_b1r1_[a-z0-9_]+$/.test(url.pathname));
}
assert.equal(runtimeUrl.pathname, ownerUrl.pathname);
assert.notEqual(runtimeUrl.username, ownerUrl.username);
assert.equal(process.env.DIRECT_URL, "");
assert(/^b1_public_[a-f0-9]+$/.test(process.env.B1_TEST_PUBLIC_ROLE));
process.env.NODE_ENV = "test"; process.env.PUBLIC_INTAKE_MODE = "synthetic";
const { phase2BFixtures: f } = await import("./seed-phase-2b-synthetic.mjs");
const { phase2CFixtures: staff } = await import("./seed-phase-2c-synthetic.mjs");
const owner = new pg.Client({ connectionString: ownerUrl.href });
const runtime = new pg.Client({ connectionString: runtimeUrl.href });
await Promise.all([owner.connect(), runtime.connect()]);
const db = await import("../src/lib/server/database.ts");
const session = await import("../src/lib/server/auth/session.ts");
const reads = await import("../src/lib/server/staff-reads.ts");
const mutations = await import("../src/lib/server/staff-mutations.ts");
const intake = await import("../src/lib/server/public-intake.ts");
const files = await import("../src/lib/server/candidate-files.ts");
const policy = await import("../src/lib/server/candidate-file-policy.ts");
const jobs = await import("../src/lib/server/repositories/background-jobs.ts");
const worker = await import("../src/lib/server/background-worker.ts");
const mail = await import("../src/lib/server/candidate-notifications.ts");
let checks = 0;
const check = (value, expected = true) => { assert.deepEqual(value, expected); checks++; };
const rejects = async fn => { await assert.rejects(fn); checks++; };
async function denied(client, sql, code = "42501") {
  await client.query("SAVEPOINT denied");
  let failure;
  try { await client.query(sql); } catch (error) { failure = error; }
  await client.query("ROLLBACK TO SAVEPOINT denied");
  await client.query("RELEASE SAVEPOINT denied");
  assert.equal(failure?.code, code, sql); checks++;
}
function fields(job = true) {
  return new URLSearchParams({ applicationType: job ? "JOB_APPLICATION" : "TALENT_NETWORK",
    ...(job ? { jobId: f.jobId, [`answer.${f.jobQuestionId}`]: f.jobQuestionOptionId }
      : { departmentId: f.departmentId, engagementType: "PERMANENT_INTEREST" }),
    fullName: "Synthetic B1 Permission Candidate", email: "synthetic.b1@example.invalid", city: "Synthetic City",
    experienceLevel: "SYNTHETIC_LEVEL", consentDefinitionId: f.consentDefinitionId, consent: "accepted", idempotencyKey: randomUUID() });
}
const submit = data => db.transaction(e => intake.submitIntake(data, e));
const mutate = (input, principal) => mutations.performStaffMutation(input, { resolvePrincipal: async () => principal });
const park = () => owner.query(`UPDATE public."BackgroundJob" SET "availableAt"='2099-01-01' WHERE "state"='QUEUED'`);
async function claim(id) {
  await owner.query(`UPDATE public."BackgroundJob" SET "availableAt"='2000-01-01' WHERE "id"=$1`, [id]);
  const [job] = await jobs.claimBackgroundJobs(1, 60); check(job?.id, id); return job;
}
const bytes = syntheticPdf(), digest = policy.sha256(bytes);
const storage = { objects: new Map(),
  async allocateId() { return `synthetic${randomUUID().replaceAll("-", "")}`; },
  async put(id, name, data, hash) { this.objects.set(id, { name, bytes: Buffer.from(data), digest: hash }); },
  async get(id) { return this.objects.get(id)?.bytes ?? Promise.reject(new Error("Synthetic missing")); },
  async delete(id) { this.objects.delete(id); },
  async verify(item) { const object = this.objects.get(item.id); return !!object && object.name === item.name && object.digest === item.digest && object.bytes.length === item.size; },
  async erase(item) { if (this.objects.has(item.id)) check(await this.verify(item)); this.objects.delete(item.id); },
};
try {
  const flags = (await runtime.query("SELECT rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication FROM pg_roles WHERE rolname=current_user")).rows[0];
  for (const flag of Object.values(flags)) check(flag, false);
  check((await runtime.query("SELECT current_user")).rows[0].current_user, runtimeUrl.username);
  for (const role of ["pyramid_reference_locker", ownerUrl.username, ...administratorRoles, "anon", "authenticated"])
    check((await runtime.query("SELECT pg_has_role(current_user,$1,'SET') AS allowed", [role])).rows[0].allowed, false);
  check((await owner.query("SELECT count(*)::int AS n FROM pg_class WHERE relnamespace='public'::regnamespace AND relowner='pyramid_runtime'::regrole")).rows[0].n, 0);
  check((await owner.query("SELECT count(*)::int AS n FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND NOT relrowsecurity")).rows[0].n, 0);
  const tables = (await owner.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r => r.tablename);
  check(tables.length, 29);
  const readable = ["StaffUser", "UserRole", "Department", "Project", "JobLocation", "Job", "JobQuestion", "JobQuestionOption", "ConsentDefinition", "RetentionPolicy",
    "Application", "ApplicationAnswer", "CandidateFile", "FileSecurityReview", "CandidateConsent", "ApplicationStatusEvent", "AuditEvent", "BackgroundJob", "IdempotencyRecord", "RateLimitBucket",
    "InternalNote", "Discipline", "Sector", "ProjectMedia", "ProjectCredit", "ProjectDiscipline", "ProjectSector"];
  const insertable = ["Project", "Application", "ApplicationAnswer", "CandidateFile", "FileSecurityReview", "CandidateConsent", "ApplicationStatusEvent", "AuditEvent", "BackgroundJob", "IdempotencyRecord", "RateLimitBucket",
    "Job", "JobQuestion", "JobQuestionOption", "InternalNote", "ProjectCredit", "ProjectDiscipline", "ProjectSector"];
  for (const table of tables) for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"])
    check((await runtime.query("SELECT has_table_privilege(current_user,$1,$2) AS allowed", [`public.\"${table}\"`, privilege])).rows[0].allowed,
      privilege === "SELECT" ? readable.includes(table) : privilege === "INSERT" ? insertable.includes(table)
        : privilege === "DELETE" ? ["ApplicationAnswer", "IdempotencyRecord", "ProjectCredit", "ProjectDiscipline", "ProjectSector", "JobQuestionOption"].includes(table) : false);
  check((await owner.query("SELECT count(*)::int AS n FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND relowner<>$1::regrole", [ownerUrl.username])).rows[0].n, 0);
  check((await owner.query("SELECT count(*)::int AS n FROM pg_auth_members WHERE member=$1::regrole AND (roleid<>'pyramid_runtime'::regrole OR admin_option)", [runtimeUrl.username])).rows[0].n, 0);
  const funcs = (await owner.query("SELECT p.oid,p.oid::regprocedure::text AS signature,p.prosecdef,p.proconfig,p.prorettype::regtype::text AS result FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','pyramid_private')")).rows
    .map(fn => ({ ...fn, signature: fn.signature.includes('.') ? fn.signature : `public.${fn.signature}` }));
  check(funcs.length, 22);
  check(funcs.filter(f => f.prosecdef).map(f => f.signature), ["pyramid_private.lock_reference(text,uuid)"]);
  for (const fn of funcs) {
    check(fn.proconfig?.[0], fn.prosecdef ? "search_path=pg_catalog" : "search_path=pg_catalog, public");
    check((await runtime.query("SELECT has_function_privilege(current_user,$1::oid,'EXECUTE') AS allowed", [fn.oid])).rows[0].allowed,
      fn.signature.includes("lock_reference(") || fn.signature.includes("check_application_submission_evidence(") || fn.signature.includes("completed_retention_evidence("));
  }
  const updateColumns = {
    Project: ["title", "summary", "version", "updatedAt", "clientDescriptor", "year", "brief", "challenge", "approach", "outcome", "featured", "publicationState", "publishAt", "publishedAt", "archivedAt"],
    Job: ["lifecycleState", "version", "closedAt", "archivedAt", "updatedAt", "title", "departmentId", "jobLocationId", "workArrangement", "employmentType", "experienceLevel", "shiftSchedule", "compensationMode", "compensationMinMinor", "compensationMaxMinor", "compensationCurrency", "compensationPeriod", "compensationText", "summary", "responsibilities", "requiredQualifications", "preferredQualifications", "hiringProcessCopy", "applicationDeadline", "publishAt", "publishedAt"],
    JobQuestion: ["questionType", "prompt", "required", "sortOrder", "active"],
    ProjectMedia: ["altText", "caption", "accessibilityDescription", "sortOrder", "updatedAt"],
    Application: ["technicalStatus", "hiringStatus", "submittedAt", "withdrawnAt", "updatedAt", "deletionRequestedAt", "deletionCompletedAt",
      "fullName", "email", "city", "phoneOrWhatsApp", "specialism", "portfolioUrl", "professionalUrl", "availabilityText", "remoteAvailable",
      "shortIntroduction", "preferredEngagement", "freelancerRateMinMinor", "freelancerRateMaxMinor", "rateCurrency", "accommodationContactRequested",
      "safeCampaignCode", "experienceLevel", "source"],
    CandidateFile: ["technicalStatus", "securityStatus", "clearanceMethod", "clearedAt", "driveFileId", "driveZoneCode", "contentHash", "deletedAt", "version", "updatedAt"],
    BackgroundJob: ["state", "attemptCount", "claimedAt", "leaseUntil", "claimToken", "availableAt", "completedAt", "failureClass", "errorSummary", "updatedAt"],
    IdempotencyRecord: ["state", "resultReference", "requestHash", "expiresAt"], RateLimitBucket: ["count", "expiresAt"],
  };
  const columns = (await owner.query(`SELECT c.oid,c.relname,a.attname,a.attnum FROM pg_class c JOIN pg_attribute a ON a.attrelid=c.oid
    WHERE c.relnamespace='public'::regnamespace AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped`)).rows;
  for (const column of columns) {
    check((await runtime.query("SELECT has_column_privilege(current_user,$1::oid,$2::smallint,'UPDATE') AS allowed", [column.oid, column.attnum])).rows[0].allowed,
      updateColumns[column.relname]?.includes(column.attname) ?? false);
    for (const role of ["anon", "authenticated", process.env.B1_TEST_PUBLIC_ROLE])
      check((await owner.query("SELECT has_column_privilege($1,$2::oid,$3::smallint,'SELECT,INSERT,UPDATE,REFERENCES') AS allowed", [role, column.oid, column.attnum])).rows[0].allowed, false);
  }
  await runtime.query("BEGIN");
  for (const sql of [
    'ALTER TABLE public."Application" ADD COLUMN malicious int', 'DROP TABLE public."AuditEvent"',
    'CREATE TABLE public.b1_malicious(id int)', 'CREATE TABLE pyramid_private.b1_malicious(id int)',
    'CREATE TEMP TABLE "Application"(id int)', 'CREATE SCHEMA b1_malicious',
    "CREATE FUNCTION public.b1_malicious() RETURNS int LANGUAGE sql AS 'SELECT 1'",
    "CREATE FUNCTION pyramid_private.b1_malicious() RETURNS int LANGUAGE sql AS 'SELECT 1'",
    'ALTER TABLE public."Application" DISABLE ROW LEVEL SECURITY',
    `ALTER ROLE ${runtimeUrl.username} BYPASSRLS`, 'CREATE ROLE b1_malicious',
    `GRANT pyramid_reference_locker TO ${runtimeUrl.username}`, 'GRANT pyramid_runtime TO anon',
    'SET ROLE pyramid_reference_locker', `SET ROLE ${ownerUrl.username}`,
    `SET SESSION AUTHORIZATION ${ownerUrl.username}`,
    'SELECT * FROM public._prisma_migrations', 'SELECT * FROM public."CompatibilityProbe"',
    'SELECT public.prevent_immutable_change()',
    'LOCK TABLE public."AuditEvent" IN ACCESS EXCLUSIVE MODE', 'SET LOCAL session_replication_role=replica',
    'ALTER FUNCTION pyramid_private.lock_reference(text,uuid) SECURITY INVOKER',
    'DROP FUNCTION pyramid_private.lock_reference(text,uuid)',
  ]) await denied(runtime, sql);
  for (const table of ["AuditEvent", "CandidateConsent", "ApplicationStatusEvent", "FileSecurityReview", "StaffUser", "UserRole", "Department", "ConsentDefinition", "RetentionPolicy", "InternalNote", "JobQuestion"]) {
    await denied(runtime, `UPDATE public."${table}" SET "id"="id"`);
    await denied(runtime, `DELETE FROM public."${table}"`);
  }
  for (const table of ["Project", "Job", "Application", "CandidateFile", "BackgroundJob", "IdempotencyRecord", "RateLimitBucket", "JobQuestionOption", "ProjectCredit", "ProjectMedia"])
    await denied(runtime, `UPDATE public."${table}" SET "id"="id"`);
  await denied(runtime, 'SELECT "id" FROM public."FileSecurityReview" FOR UPDATE');
  await runtime.query("SET LOCAL row_security=off");
  await denied(runtime, 'SELECT * FROM public."Application"');
  await runtime.query("SET LOCAL row_security=on");
  await runtime.query("SET LOCAL search_path=pg_temp, public, pg_catalog");
  await runtime.query(`SELECT pyramid_private.lock_reference('STAFF', '${staff.managerStaffId}')`); checks++;
  await denied(runtime, "SELECT pyramid_private.lock_reference('public; DROP TABLE AuditEvent',NULL)", "22023");
  await runtime.query('GRANT SELECT ON public."AuditEvent" TO anon');
  check((await runtime.query("SELECT has_table_privilege('anon','public.\"AuditEvent\"','SELECT') AS allowed")).rows[0].allowed, false);
  check((await runtime.query('DELETE FROM public."ApplicationAnswer" WHERE "applicationId"=$1', [f.applicationId])).rowCount, 0);
  await runtime.query("ROLLBACK");

  for (const role of ["anon", "authenticated", process.env.B1_TEST_PUBLIC_ROLE]) {
    await owner.query("BEGIN"); await owner.query(`SET LOCAL ROLE ${role}`);
    for (const table of tables) for (const sql of [`SELECT * FROM public."${table}"`, `INSERT INTO public."${table}" DEFAULT VALUES`,
      `UPDATE public."${table}" SET "id"="id"`, `DELETE FROM public."${table}"`]) await denied(owner, sql);
    for (const fn of funcs) {
      check((await owner.query("SELECT has_function_privilege(current_user,$1::oid,'EXECUTE') AS allowed", [fn.oid])).rows[0].allowed, false);
      await denied(owner, `SELECT ${fn.signature.includes("lock_reference") ? "pyramid_private.lock_reference('STAFF',NULL)"
        : fn.signature.replace("(uuid)", "(NULL::uuid)")}`);
    }
    await owner.query("ROLLBACK");
  }
  await owner.query("BEGIN");
  await owner.query("CREATE TABLE public.b1_default_probe(id int)");
  await owner.query("CREATE FUNCTION public.b1_default_probe() RETURNS int LANGUAGE sql AS 'SELECT 1'");
  for (const role of ["anon", "authenticated", process.env.B1_TEST_PUBLIC_ROLE, runtimeUrl.username]) {
    check((await owner.query("SELECT has_table_privilege($1,'public.b1_default_probe','SELECT') AS allowed", [role])).rows[0].allowed, false);
    check((await owner.query("SELECT has_function_privilege($1,'public.b1_default_probe()','EXECUTE') AS allowed", [role])).rows[0].allowed, false);
  }
  await owner.query("ROLLBACK");
  // Even the locking owner cannot mutate references or create objects.
  await owner.query("BEGIN"); await owner.query("SET LOCAL ROLE pyramid_reference_locker");
  for (const table of ["StaffUser", "UserRole", "Department", "ConsentDefinition", "RetentionPolicy", "JobQuestion", "JobQuestionOption", "JobLocation", "Discipline", "Sector"])
    await denied(owner, `UPDATE public."${table}" SET "id"="id"`, ["ConsentDefinition", "RetentionPolicy"].includes(table) ? "55000" : "42501");
  await denied(owner, 'CREATE TABLE pyramid_private.b1_lock_owner_escalation(id int)');
  await owner.query("ROLLBACK");
  console.log(`B1_NEGATIVE_ISOLATION_OK checks=${checks} browser_roles=3 functions=22`);

  const claims = async () => ({ subjectId: staff.subjects.manager, assuranceLevel: "aal2" });
  const manager = await session.resolveAuthenticatedStaff(claims);
  check(manager.roles, ["HIRING_MANAGER"]);
  const editor = await session.resolveAuthenticatedStaff(async () => ({ subjectId: staff.subjects.contentEditor, assuranceLevel: "aal2" }));
  check(await session.resolveAuthenticatedStaff(async () => null), null);
  check(await session.resolveAuthenticatedStaff(async () => ({ subjectId: "synthetic-unmapped", assuranceLevel: "aal2" })), null);
  await owner.query('UPDATE public."StaffUser" SET "status"=\'DISABLED\',"disabledAt"=clock_timestamp() WHERE "id"=$1', [staff.managerStaffId]);
  check(await session.resolveAuthenticatedStaff(claims), null);
  await owner.query('UPDATE public."StaffUser" SET "status"=\'ACTIVE\',"disabledAt"=NULL WHERE "id"=$1', [staff.managerStaffId]);
  await rejects(() => reads.listStaffContent({ ...editor, assuranceLevel: "aal1" }));
  const created = await mutate({ type: "content.create", idempotencyKey: randomUUID(), slug: `synthetic-b1-${randomUUID()}`,
    title: "Synthetic B1 draft", summary: "Synthetic permission verification only." }, editor);
  check(created.outcome, "APPLIED");
  check((await reads.listStaffContent(editor)).some(r => r.id === created.targetId));
  const edit = { type: "content.edit", idempotencyKey: randomUUID(), contentId: created.targetId, expectedVersion: 1,
    title: "Synthetic B1 edited", summary: "Synthetic permission verification only." };
  check((await mutate(edit, editor)).outcome, "APPLIED");
  check((await mutate(edit, editor)).outcome, "ALREADY_APPLIED");
  await rejects(() => mutate({ ...edit, idempotencyKey: randomUUID(), expectedVersion: 1 }, editor));
  await rejects(() => mutate(edit, manager));
  check((await intake.getIntakeContext(f.jobId)).questions.length, 1);
  const data = fields(), [a, retry] = await Promise.all([submit(data), submit(data)]);
  check(a.id, retry.id); check(a.technicalStatus, "SUBMITTED");
  const talent = await submit(fields(false)); check(talent.applicationType, "TALENT_NETWORK");
  check((await db.query('SELECT count(*)::int AS n FROM public."CandidateConsent" WHERE "applicationId"=$1', [a.id])).rows[0].n, 1);
  await rejects(() => submit(new URLSearchParams({ ...Object.fromEntries(fields()), consent: "rejected" })));
  const hiring = { type: "application.hiring_status.change", applicationId: a.id, expectedHiringStatus: "NEW",
    requestedHiringStatus: "UNDER_REVIEW", idempotencyKey: randomUUID() };
  check((await mutate(hiring, manager)).outcome, "APPLIED");
  check((await reads.listStaffApplications(manager)).some(row => row.id === a.id));
  check((await reads.readStaffApplicationContact(manager, a.id)).email, "synthetic.b1@example.invalid");
  await rejects(() => mutate({ ...hiring, idempotencyKey: randomUUID() }, editor));
  await rejects(() => mutate({ ...hiring, idempotencyKey: randomUUID(), expectedHiringStatus: "UNDER_REVIEW", requestedHiringStatus: "HIRED" }, manager));
  await park();

  // Runtime SKIP LOCKED uses separate transactions/connections, not mock SQL.
  const input = { jobType: "SYNTHETIC_2IB", safePayload: { version: 1 }, dedupeKey: randomUUID(), maxAttempts: 2, availableAt: new Date("2000-01-01") };
  const firstId = await jobs.enqueueBackgroundJob(input); check(await jobs.enqueueBackgroundJob(input), firstId);
  const secondId = await jobs.enqueueBackgroundJob({ ...input, dedupeKey: randomUUID() });
  const other = new pg.Client({ connectionString: runtimeUrl.href }); await other.connect();
  let first, second;
  try {
    await Promise.all([runtime.query("BEGIN"), other.query("BEGIN")]);
    [first] = await jobs.claimBackgroundJobs(1, 60, runtime); [second] = await jobs.claimBackgroundJobs(1, 60, other);
    check(new Set([first.id, second.id]), new Set([firstId, secondId]));
    await Promise.all([runtime.query("COMMIT"), other.query("COMMIT")]);
  } finally { await other.end(); }
  check(await jobs.completeBackgroundJob(first.id, randomUUID()), false);
  check(await jobs.completeBackgroundJob(first.id, first.claimToken));
  check(await jobs.failBackgroundJob(second.id, second.claimToken, "TRANSIENT"), "QUEUED");
  const again = await claim(second.id); check(again.claimToken !== second.claimToken);
  check(await jobs.completeBackgroundJob(second.id, second.claimToken), false);
  check(await jobs.failBackgroundJob(second.id, again.claimToken, "TRANSIENT"), "DEAD");
  const reclaimId = await jobs.enqueueBackgroundJob({ ...input, dedupeKey: randomUUID(), maxAttempts: 3 });
  const old = await claim(reclaimId);
  await owner.query('UPDATE public."BackgroundJob" SET "leaseUntil"=clock_timestamp()-interval \'1 second\' WHERE "id"=$1', [reclaimId]);
  const fresh = await claim(reclaimId); check(fresh.claimToken !== old.claimToken);
  check(await jobs.completeBackgroundJob(reclaimId, old.claimToken), false);
  check(await jobs.completeBackgroundJob(reclaimId, fresh.claimToken));
  const exhaustedId = await jobs.enqueueBackgroundJob({ ...input, dedupeKey: randomUUID(), maxAttempts: 1 });
  await claim(exhaustedId);
  await owner.query('UPDATE public."BackgroundJob" SET "leaseUntil"=clock_timestamp()-interval \'1 second\' WHERE "id"=$1', [exhaustedId]);
  check((await jobs.recoverExhaustedJobs()).some(job => job.id === exhaustedId));

  const fileData = fields(false), fileApp = await files.storeCandidateApplication(fileData, bytes, digest, bytes.length, storage);
  const file = (await db.query('SELECT "id" FROM public."CandidateFile" WHERE "applicationId"=$1', [fileApp.id])).rows[0];
  await files.initiateCandidateFileReview(manager, file.id);
  const review = { observedSha256: digest, outcome: "CLEAN", startedAt: new Date().toISOString(), idempotencyKey: randomUUID(), toolVersion: "Synthetic B1 test" };
  await Promise.all([files.recordCandidateFileReview(manager, file.id, review), files.recordCandidateFileReview(manager, file.id, review)]);
  check((await db.query('SELECT count(*)::int AS n FROM public."FileSecurityReview" WHERE "candidateFileId"=$1', [file.id])).rows[0].n, 1);
  await rejects(() => files.recordCandidateFileReview(manager, file.id, { ...review, outcome: "REJECTED" }));
  await rejects(() => files.recordCandidateFileReview({ ...manager, assuranceLevel: "aal1" }, file.id, review));
  const anotherApp = await files.storeCandidateApplication(fields(false), bytes, digest, bytes.length, storage);
  const anotherFile = (await db.query('SELECT "id" FROM public."CandidateFile" WHERE "applicationId"=$1', [anotherApp.id])).rows[0];
  await files.initiateCandidateFileReview(manager, anotherFile.id);
  const anotherReview = { ...review, startedAt: new Date().toISOString() };
  await rejects(() => files.recordCandidateFileReview(manager, anotherFile.id, anotherReview));
  await rejects(() => files.recordCandidateFileReview(manager, anotherFile.id, { ...anotherReview, idempotencyKey: randomUUID(), observedSha256: "a".repeat(64) }));
  await files.recordCandidateFileReview(manager, anotherFile.id, { ...anotherReview, outcome: "REJECTED", idempotencyKey: randomUUID() });
  check((await db.query('SELECT "securityStatus" FROM public."CandidateFile" WHERE "id"=$1', [anotherFile.id])).rows[0].securityStatus, "REJECTED");
  // Same key on different parents races against the global unique constraint.
  const concurrentFiles = [];
  for (let n = 0; n < 2; n++) {
    const app = await files.storeCandidateApplication(fields(false), bytes, digest, bytes.length, storage);
    const row = (await db.query('SELECT "id" FROM public."CandidateFile" WHERE "applicationId"=$1', [app.id])).rows[0];
    await files.initiateCandidateFileReview(manager, row.id); concurrentFiles.push(row.id);
  }
  const raceReview = { ...review, startedAt: new Date().toISOString(), idempotencyKey: randomUUID() };
  const outcomes = await Promise.allSettled(concurrentFiles.map(id => files.recordCandidateFileReview(manager, id, raceReview)));
  check(outcomes.filter(result => result.status === "fulfilled").length, 1);
  check((await db.query('SELECT count(*)::int AS n FROM public."FileSecurityReview" WHERE "idempotencyKey"=$1', [raceReview.idempotencyKey])).rows[0].n, 1);
  const failedTarget = concurrentFiles[outcomes.findIndex(result => result.status === "rejected")];
  const failedReview = { ...raceReview, outcome: "FAILED", idempotencyKey: randomUUID() };
  await files.recordCandidateFileReview(manager, failedTarget, failedReview);
  await files.recordCandidateFileReview(manager, failedTarget, failedReview);
  check((await db.query('SELECT "securityStatus" FROM public."CandidateFile" WHERE "id"=$1', [failedTarget])).rows[0].securityStatus, "REVIEW_FAILED");
  const rrApp = await files.storeCandidateApplication(fields(false), bytes, digest, bytes.length, storage);
  const rrFile = (await db.query('SELECT "id" FROM public."CandidateFile" WHERE "applicationId"=$1', [rrApp.id])).rows[0];
  await files.initiateCandidateFileReview(manager, rrFile.id);
  const rrReview = { ...review, startedAt: new Date().toISOString(), idempotencyKey: randomUUID() };
  let snapshots = 0, releaseSnapshots;
  const bothSnapshots = new Promise(resolve => { releaseSnapshots = resolve; });
  const repeatable = async work => {
    const client = new pg.Client({ connectionString: runtimeUrl.href }); await client.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
      await work({ query: async (sql, values) => {
        const result = await client.query(sql, values);
        if (sql.includes("lock_reference('STAFF'")) {
          if (++snapshots === 2) releaseSnapshots();
          await bothSnapshots;
        }
        return result;
      } });
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { await client.end(); }
  };
  const rrResults = await Promise.allSettled([1, 2].map(() => files.recordCandidateFileReview(manager, rrFile.id, rrReview, repeatable)));
  check(rrResults.filter(result => result.status === "fulfilled").length, 1);
  check(rrResults.find(result => result.status === "rejected").reason.code, "40001");
  await files.recordCandidateFileReview(manager, rrFile.id, rrReview);
  check((await db.query('SELECT count(*)::int AS n FROM public."FileSecurityReview" WHERE "idempotencyKey"=$1', [rrReview.idempotencyKey])).rows[0].n, 1);
  // Recovery after an uploaded object exists but finalization was interrupted.
  await park();
  const recoveryApp = await files.storeCandidateApplication(fields(false), bytes, digest, bytes.length, storage);
  const recoveryFile = (await db.query('SELECT "id" FROM public."CandidateFile" WHERE "applicationId"=$1', [recoveryApp.id])).rows[0];
  await owner.query('UPDATE public."Application" SET "technicalStatus"=\'SUBMISSION_PENDING\' WHERE "id"=$1', [recoveryApp.id]);
  await owner.query('UPDATE public."CandidateFile" SET "technicalStatus"=\'UPLOAD_PENDING\' WHERE "id"=$1', [recoveryFile.id]);
  const recoveryJob = (await db.query('SELECT "id" FROM public."BackgroundJob" WHERE "candidateFileId"=$1', [recoveryFile.id])).rows[0];
  await owner.query('UPDATE public."BackgroundJob" SET "state"=\'QUEUED\',"completedAt"=NULL WHERE "id"=$1', [recoveryJob.id]);
  await worker.reconcileCandidateFile(await claim(recoveryJob.id), storage);
  check((await db.query('SELECT "technicalStatus" FROM public."Application" WHERE "id"=$1', [recoveryApp.id])).rows[0].technicalStatus, "SECURITY_PENDING");
  await park();
  const notification = (await db.query('SELECT "id" FROM public."BackgroundJob" WHERE "applicationId"=$1 AND "jobType"=$2', [a.id, mail.NOTIFICATION_JOB])).rows[0];
  const emailClaim = await claim(notification.id), adapter = syntheticEmailAdapter();
  check(await mail.sendCandidateConfirmation(emailClaim, adapter, AbortSignal.timeout(3000), worker.workerTransaction), "SUCCEEDED");
  check(adapter.calls, 1);
  // Provider-mode code is exercised with an in-memory idempotent adapter only.
  await park();
  const acknowledgedApp = await submit(fields(false));
  const acknowledgedJob = (await db.query('SELECT "id" FROM public."BackgroundJob" WHERE "applicationId"=$1 AND "jobType"=$2', [acknowledgedApp.id, mail.NOTIFICATION_JOB])).rows[0];
  const acknowledgedClaim = await claim(acknowledgedJob.id);
  let acknowledgedCalls = 0;
  const effects = new Set();
  const acknowledgedAdapter = { mode: "provider", provider: "syntheticb1",
    requestFingerprint: envelope => policy.sha256(Buffer.from(JSON.stringify(envelope))),
    get calls() { return acknowledgedCalls; },
    async send(envelope, signal) {
      assert(envelope.recipient.endsWith("@example.invalid")); signal.throwIfAborted();
      acknowledgedCalls++; effects.add(envelope.identity);
      return { outcome: "ACCEPTED", receipt: "synthetic_b1_receipt" };
    },
  };
  let permit;
  await rejects(() => mail.sendCandidateConfirmation(acknowledgedClaim, acknowledgedAdapter, AbortSignal.timeout(3000),
    work => db.transaction(e => work({ query: (sql, values) => {
      if (sql.includes("SET \"state\" = 'SUCCEEDED'")) throw new Error("Synthetic acknowledgement fault.");
      return e.query(sql, values);
    } })), value => { permit = value; }));
  check(acknowledgedAdapter.calls, 1); check(!!permit);
  check(await mail.reconcileCandidateConfirmation(permit, AbortSignal.timeout(3000), worker.workerTransaction), "SUCCEEDED");
  check(acknowledgedAdapter.calls, 2); check(effects.size, 1);
  await rejects(() => mail.reconcileCandidateConfirmation(permit, AbortSignal.timeout(3000), worker.workerTransaction));
  await park();
  // Owner-only clock fault injection; runtime cannot rewrite retention clocks.
  await owner.query('UPDATE public."Application" SET "expiresAt"=clock_timestamp()-interval \'1 day\' WHERE "id"=$1', [fileApp.id]);
  const retentionId = await jobs.enqueueBackgroundJob({ jobType: "APPLICATION_RETENTION_DELETE", applicationId: fileApp.id,
    safePayload: { version: 1 }, dedupeKey: `application-retention:${fileApp.id}` });
  const retentionJob = await claim(retentionId);
  await worker.deleteRetainedApplication(retentionJob, storage);
  const tombstone = (await db.query('SELECT "fullName","email","deletionCompletedAt" FROM public."Application" WHERE "id"=$1', [fileApp.id])).rows[0];
  check(tombstone.fullName, null); check(tombstone.email, null); check(!!tombstone.deletionCompletedAt);
  check((await db.query('SELECT public.completed_retention_evidence($1) AS valid', [fileApp.id])).rows[0].valid);
  await rejects(() => db.query('UPDATE public."Application" SET "expiresAt"=clock_timestamp() WHERE "id"=$1', [a.id]));
  await rejects(() => db.query('UPDATE public."BackgroundJob" SET "state"=\'QUEUED\' WHERE "id"=$1', [retentionId]));
  process.env.NODE_ENV = "production"; check(await db.transaction(worker.enqueueDueRetention), 0); process.env.NODE_ENV = "test";
  await park();
  await submit(fields(false));
  const coordinated = await worker.runBackgroundWorker({ storage: () => storage, email: syntheticEmailAdapter() });
  check(coordinated.admitted); check(coordinated.succeeded >= 1);
  check((await worker.runBackgroundWorker({ storage: () => storage, email: syntheticEmailAdapter() })).admitted, false);

  const base = Date.now();
  for (let n = 0; n < 20; n++) check(await intake.consumeIntakeLimit(undefined, base));
  check(await intake.consumeIntakeLimit(undefined, base), false);
  check(await intake.consumeIntakeLimit(undefined, base + 61000));
  await owner.query('DELETE FROM public."RateLimitBucket" WHERE "scope"=\'PUBLIC_INTAKE_GLOBAL\'');
  const admissions = await Promise.all(Array.from({ length: 45 }, () => intake.consumeIntakeLimit()));
  check(admissions.filter(Boolean).length, 20);
  await rejects(() => intake.consumeIntakeLimit({ query: async () => { throw new Error("Synthetic DB failure"); } }));
  for (const count of [null, -1, 0, 22, "1"]) await rejects(() => intake.consumeIntakeLimit({ query: async () => ({ rows: [{ count }] }) }));
  console.log(`B1_RUNTIME_WORKFLOWS_OK checks=${checks} parallel_admitted=20/45 live_requests=0`);

  // Definer locks remain owned by the caller's transaction until COMMIT.
  await runtime.query("BEGIN");
  for (const [kind, id] of [["STAFF", staff.managerStaffId], ["DEPARTMENT", f.departmentId], ["CONSENT", f.consentDefinitionId], ["RETENTION", f.retentionPolicyId], ["JOB_QUESTIONS", f.jobId]])
    await runtime.query("SELECT pyramid_private.lock_reference($1,$2)", [kind, id]);
  await owner.query("BEGIN"); await owner.query("SET LOCAL lock_timeout='100ms'");
  for (const [table, id] of [["StaffUser", staff.managerStaffId], ["UserRole", staff.managerRoleId], ["Department", f.departmentId],
    ["ConsentDefinition", f.consentDefinitionId], ["RetentionPolicy", f.retentionPolicyId], ["JobQuestion", f.jobQuestionId], ["JobQuestionOption", f.jobQuestionOptionId]])
    await denied(owner, `UPDATE public."${table}" SET "id"="id" WHERE "id"='${id}'`, "55P03");
  await owner.query("ROLLBACK"); await runtime.query("COMMIT");
  await runtime.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
  await runtime.query('SELECT "status" FROM public."StaffUser" WHERE "id"=$1', [staff.managerStaffId]);
  await owner.query('UPDATE public."StaffUser" SET "status"=\'DISABLED\',"disabledAt"=clock_timestamp() WHERE "id"=$1', [staff.managerStaffId]);
  await denied(runtime, `SELECT pyramid_private.lock_reference('STAFF','${staff.managerStaffId}')`, "40001");
  await runtime.query("ROLLBACK");
  await owner.query('UPDATE public."StaffUser" SET "status"=\'ACTIVE\',"disabledAt"=NULL WHERE "id"=$1', [staff.managerStaffId]);
  // Retiring the selected policy between selection and lock must fail closed.
  let retired = false;
  await rejects(() => db.transaction(e => intake.getIntakeContext(undefined, { query: async (sql, values) => {
    if (!retired && sql.includes("lock_reference('CONSENT'")) {
      retired = true;
      await owner.query('UPDATE public."ConsentDefinition" SET "status"=\'RETIRED\',"retiredAt"=clock_timestamp() WHERE "id"=$1', [f.consentDefinitionId]);
    }
    return e.query(sql, values);
  } })));
  check(retired);
  const transition = { type: "job.transition", jobId: f.jobId, expectedVersion: 1, requestedLifecycleState: "CLOSED", idempotencyKey: randomUUID() };
  check((await mutate(transition, manager)).outcome, "APPLIED");
  console.log(`B1_PERMISSION_BOUNDARY_OK checks=${checks} roles=separate nonowner_runtime=true immutable_update_delete=denied`);
} finally {
  await Promise.all([owner.query("ROLLBACK").catch(() => {}), runtime.query("ROLLBACK").catch(() => {})]);
  await Promise.all([owner.end(), runtime.end(), db.closeDatabasePool()]);
}
