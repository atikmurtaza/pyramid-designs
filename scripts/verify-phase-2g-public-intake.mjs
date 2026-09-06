import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { config } from "dotenv";
import { Pool } from "pg";
import { phase2BFixtures as f } from "./seed-phase-2b-synthetic.mjs";
config({ path: ".env.local", quiet: true });
assert.equal(Number(process.versions.node.split(".")[0]), 22);
const db = await import("../src/lib/server/database.ts");
const intake = await import("../src/lib/server/public-intake.ts");
const reads = await import("../src/lib/server/staff-reads.ts");
let checks = 0;
const admin = { staffUserId: f.adminStaffId, authSubjectId: "synthetic-admin", roles: ["ADMIN"], assuranceLevel: "aal2" };
function payload(overrides = {}) {
  return new URLSearchParams({ applicationType: "JOB_APPLICATION", jobId: f.jobId,
    fullName: "Synthetic Intake Verification", email: "synthetic.intake@example.invalid", city: "Synthetic City",
    experienceLevel: "SYNTHETIC_LEVEL", consentDefinitionId: f.consentDefinitionId,
    consent: "accepted", idempotencyKey: randomUUID(), [`answer.${f.jobQuestionId}`]: f.jobQuestionOptionId, ...overrides });
}
function talent(overrides = {}) {
  const data = payload({ applicationType: "TALENT_NETWORK", departmentId: f.departmentId, engagementType: "PERMANENT_INTEREST", ...overrides });
  data.delete("jobId"); data.delete(`answer.${f.jobQuestionId}`); return data;
}
async function checkpoint(executor, work) {
  await executor.query("SAVEPOINT phase2g_case");
  try { await work(); checks++; if (checks % 10 === 0) console.log(`PHASE2G_CHECKS ${checks}`); } finally { await executor.query("ROLLBACK TO SAVEPOINT phase2g_case"); await executor.query("RELEASE SAVEPOINT phase2g_case"); }
}
async function forceConstraints(executor) {
  await executor.query("SET CONSTRAINTS ALL IMMEDIATE");
  await executor.query("SET CONSTRAINTS ALL DEFERRED");
}
async function counts(executor) {
  return (await executor.query(`SELECT (SELECT count(*) FROM public."Application")::int AS applications,
    (SELECT count(*) FROM public."ApplicationAnswer")::int AS answers,
    (SELECT count(*) FROM public."CandidateConsent")::int AS consents,
    (SELECT count(*) FROM public."IdempotencyRecord")::int AS retries,
    (SELECT count(*) FROM public."ApplicationStatusEvent")::int AS events`)).rows[0];
}
async function rawApplication(executor, fileRequired, consent = true) {
  const id = randomUUID();
  await executor.query(`INSERT INTO public."Application" ("id", "publicReference", "applicationType", "departmentId", "engagementType",
    "fullName", "email", "city", "experienceLevel", "source", "retentionPolicyId", "expiresAt", "updatedAt", "requiresClearedFile")
    VALUES ($1, $2, 'TALENT_NETWORK', $3, 'PERMANENT_INTEREST', 'Synthetic Invariant', 'synthetic.invariant@example.invalid',
    'Synthetic City', 'SYNTHETIC_LEVEL', 'SYNTHETIC_TEST', $4, CURRENT_TIMESTAMP + interval '30 days', CURRENT_TIMESTAMP, $5)`,
    [id, `PD-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`, f.departmentId, f.retentionPolicyId, fileRequired]);
  if (consent) await executor.query(`INSERT INTO public."CandidateConsent" ("id", "applicationId", "consentDefinitionId", "decision", "source", "requestId")
    VALUES ($1, $2, $3, 'ACCEPTED', 'TALENT_FORM', 'synthetic-phase2g-invariant')`, [randomUUID(), id, f.consentDefinitionId]);
  return id;
}
async function markSubmitted(executor, id) {
  await executor.query(`UPDATE public."Application" SET "technicalStatus" = 'SUBMITTED', "hiringStatus" = 'NEW', "submittedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`, [id]);
}
async function attachMetadata(executor, applicationId, cleared = false) {
  const id = randomUUID();
  // Metadata fixtures only. No binary exists, no storage or scanning operation is performed.
  await executor.query(`INSERT INTO public."CandidateFile" ("id", "applicationId", "storedFilename", "extension", "declaredMime", "detectedMime",
    "sizeBytes", "contentHash", "validationStatus", "technicalStatus", "securityStatus", "clearanceMethod", "clearedAt", "updatedAt")
    VALUES ($1, $2, $3, 'pdf', 'application/pdf', 'application/pdf', 1024, $4, 'PASSED', 'QUARANTINED',
    $5::"FileSecurityStatus", $6::"SecurityReviewMethod", $7, CURRENT_TIMESTAMP)`,
    [id, applicationId, `${id}.pdf`, "a".repeat(64), cleared ? "CLEARED" : "UNREVIEWED", cleared ? "MANUAL" : null, cleared ? new Date() : null]);
  if (cleared) await executor.query(`INSERT INTO public."FileSecurityReview" ("id", "candidateFileId", "method", "systemActorCode", "toolDescription",
    "fileHashSnapshot", "outcome", "outcomeCode", "idempotencyKey", "startedAt", "completedAt")
    VALUES ($1, $2, 'MANUAL', 'SYNTHETIC_TEST', 'SYNTHETIC_METADATA_NO_SCAN', $3, 'CLEARED', 'SYNTHETIC_ONLY', $4, $5, $5)`,
    [randomUUID(), id, "a".repeat(64), randomUUID(), new Date(Date.now() - 1000)]);
  return id;
}

try {
  const original = await counts(db.database);
  let completed = false;
  await assert.rejects(db.transaction(async (executor) => {
    try {
    // All synthetic domain writes, fixtures and fault-injection triggers roll back.
    const initial = await counts(executor);
    assert.equal((await executor.query(`SELECT "requiresClearedFile" FROM public."Application" WHERE "id" = $1`, [f.applicationId])).rows[0]?.requiresClearedFile, true);
    const column = (await executor.query(`SELECT is_nullable, column_default FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Application' AND column_name = 'requiresClearedFile'`)).rows[0];
    assert.equal(column.is_nullable, "NO"); assert.equal(column.column_default, "true"); checks++;

    const data = payload();
    const result = await intake.submitIntake(data, executor);
    await forceConstraints(executor);
    assert.equal(result.technicalStatus, "SUBMITTED"); assert.equal(result.hiringStatus, "NEW");
    assert.equal((await executor.query(`SELECT "requiresClearedFile" FROM public."Application" WHERE "id" = $1`, [result.id])).rows[0].requiresClearedFile, false);
    const contact = await reads.readStaffApplicationContact(admin, result.id, executor);
    assert.equal(contact.email, "synthetic.intake@example.invalid");
    assert((await reads.listStaffApplications(admin, executor)).some((row) => row.id === result.id));
    await assert.rejects(reads.readStaffApplicationContact(null, result.id, executor));
    await assert.rejects(reads.readStaffApplicationContact({ ...admin, assuranceLevel: "aal1" }, result.id, executor));
    await assert.rejects(reads.readStaffApplicationContact({ ...admin, roles: ["CONTENT_EDITOR"] }, result.id, executor));
    await assert.rejects(reads.readStaffApplicationContact(admin, randomUUID(), executor));
    assert.equal((await intake.submitIntake(data, executor)).id, result.id);
    const afterRetry = await counts(executor);
    assert.equal(afterRetry.applications, initial.applications + 1); assert.equal(afterRetry.consents, initial.consents + 1);
    assert.equal(afterRetry.events, initial.events + 1); checks++;
    await checkpoint(executor, async () => {
      const changed = new URLSearchParams(data); changed.set("city", "Synthetic Different City");
      await assert.rejects(intake.submitIntake(changed, executor));
    });
    await checkpoint(executor, async () => {
      await executor.query(`UPDATE public."Job" SET "lifecycleState" = 'CLOSED', "closedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`, [f.jobId]);
      assert.equal((await intake.submitIntake(data, executor)).id, result.id);
    });
    for (const engagementType of ["PERMANENT_INTEREST", "FREELANCE_PROJECT", "INTERNSHIP_EARLY_CAREER", "PORTFOLIO_INTRODUCTION"]) {
      await checkpoint(executor, async () => {
        const value = talent({ engagementType, ...(engagementType === "PORTFOLIO_INTRODUCTION" ? { portfolioUrl: "https://portfolio.example.invalid/" } : {}) });
        const application = await intake.submitIntake(value, executor); await forceConstraints(executor);
        assert.equal(application.applicationType, "TALENT_NETWORK"); assert.equal(application.jobId, null);
      });
    }
    // Server owns authoritative answer types; boolean false is a valid required answer.
    await checkpoint(executor, async () => {
      const textId = randomUUID(), longId = randomUUID(), booleanId = randomUUID();
      for (const [id, type, required, order] of [[textId, "SHORT_TEXT", true, 21], [longId, "LONG_TEXT", false, 22], [booleanId, "YES_NO", true, 23]]) {
        await executor.query(`INSERT INTO public."JobQuestion" ("id", "jobId", "questionType", "prompt", "required", "sortOrder") VALUES ($1,$2,$3::"QuestionType",'Synthetic question',$4,$5)`, [id, f.jobId, type, required, order]);
      }
      const valid = payload({ [`answer.${textId}`]: "Synthetic text <script>untrusted</script>", [`answer.${booleanId}`]: "no" });
      await intake.submitIntake(valid, executor); await forceConstraints(executor);
      const optional = payload({ [`answer.${textId}`]: "Synthetic short", [`answer.${longId}`]: "Synthetic long", [`answer.${booleanId}`]: "yes" });
      await intake.submitIntake(optional, executor); await forceConstraints(executor);
      for (const patch of [{ [`answer.${textId}`]: "x".repeat(501) }, { [`answer.${booleanId}`]: "maybe" }]) {
        const bad = new URLSearchParams(valid); bad.set("idempotencyKey", randomUUID()); for (const [key, value] of Object.entries(patch)) bad.set(key, value);
        await assert.rejects(intake.submitIntake(bad, executor));
      }
    });

    const badValues = [
      { jobId: "bad" }, { jobId: randomUUID() }, { applicationType: "CANDIDATE" }, { fullName: "" },
      { email: "bad" }, { email: "synthetic.non-test-domain@example.com" }, { fullName: "x".repeat(161) }, { city: "x".repeat(121) },
      { portfolioUrl: "javascript:alert(1)" }, { portfolioUrl: "https://user:password@example.invalid" },
      { phoneOrWhatsApp: "invalid phone" }, { technicalStatus: "SUBMITTED" }, { requiresClearedFile: "false" },
      { retentionPolicyId: f.retentionPolicyId }, { actorStaffUserId: f.adminStaffId }, { submittedAt: new Date().toISOString() },
      { file: "base64:invalid" }, { consent: "" }, { consent: "true" }, { consentDefinitionId: randomUUID() },
      { idempotencyKey: "invalid" }, { [`answer.${randomUUID()}`]: "foreign" },
      { [`answer.${f.jobQuestionId}`]: randomUUID() }, { [`answer.${f.jobQuestionId}`]: "a,b" },
    ];
    for (const values of badValues) await checkpoint(executor, async () => {
      await assert.rejects(intake.submitIntake(payload(values), executor));
    });
    for (const field of ["fullName", "email", "city", "experienceLevel", "consent", `answer.${f.jobQuestionId}`]) {
      await checkpoint(executor, async () => { const bad = payload(); bad.delete(field); await assert.rejects(intake.submitIntake(bad, executor)); });
    }
    for (const field of ["fullName", `answer.${f.jobQuestionId}`]) await checkpoint(executor, async () => {
      const bad = payload(); bad.append(field, bad.get(field)); await assert.rejects(intake.submitIntake(bad, executor));
    });
    for (const state of ["DRAFT", "SCHEDULED", "CLOSED", "ARCHIVED"]) await checkpoint(executor, async () => {
      await executor.query(`UPDATE public."Job" SET "lifecycleState" = $2::"JobLifecycleState" WHERE "id" = $1`, [f.jobId, state]);
      await assert.rejects(intake.submitIntake(payload(), executor));
    });
    for (const assignment of [`"publishAt" = clock_timestamp() + interval '1 day', "applicationDeadline" = NULL`, `"applicationDeadline" = clock_timestamp() - interval '1 second'`]) {
      await checkpoint(executor, async () => {
        await executor.query(`UPDATE public."Job" SET ${assignment} WHERE "id" = $1`, [f.jobId]);
        await assert.rejects(intake.submitIntake(payload(), executor));
      });
    }
    // Stale eligibility introduced between evidence writes and final completion.
    await checkpoint(executor, async () => {
      const before = await counts(executor);
      await executor.query("SAVEPOINT failed_submission");
      let injected = false;
      const seam = { query: async (sql, values) => {
        const rows = await executor.query(sql, values);
        if (!injected && sql.includes('INSERT INTO public."CandidateConsent"')) {
          injected = true; await executor.query(`UPDATE public."Job" SET "applicationDeadline" = clock_timestamp() - interval '1 second' WHERE "id" = $1`, [f.jobId]);
        }
        return rows;
      } };
      await assert.rejects(intake.submitIntake(payload(), seam)); assert(injected);
      await executor.query("ROLLBACK TO SAVEPOINT failed_submission");
      assert.deepEqual(await counts(executor), before);
    });
    // Forced SQL failures after insertion must roll back application, consent, answers and retry.
    for (const marker of ['INSERT INTO public."ApplicationAnswer"', 'INSERT INTO public."CandidateConsent"', 'INSERT INTO public."ApplicationStatusEvent"']) {
      await checkpoint(executor, async () => {
        const before = await counts(executor); await executor.query("SAVEPOINT failed_submission");
        const seam = { query: (sql, values) => sql.includes(marker) ? executor.query("SELECT 1 / 0") : executor.query(sql, values) };
        await assert.rejects(intake.submitIntake(payload(), seam));
        await executor.query("ROLLBACK TO SAVEPOINT failed_submission"); assert.deepEqual(await counts(executor), before);
      });
    }
    // Approved migration matrix, using metadata fixtures only and real deferred constraints.
    for (const required of [false, true]) for (const consent of [false, true]) {
      await checkpoint(executor, async () => {
        const id = await rawApplication(executor, required, consent); await markSubmitted(executor, id);
        if (!required && consent) await forceConstraints(executor); else await assert.rejects(forceConstraints(executor), { code: "23514" });
      });
    }
    for (const required of [false, true]) await checkpoint(executor, async () => {
      const id = await rawApplication(executor, required); await attachMetadata(executor, id, true); await markSubmitted(executor, id); await forceConstraints(executor);
    });
    await checkpoint(executor, async () => {
      const id = await rawApplication(executor, false); await attachMetadata(executor, id); await markSubmitted(executor, id);
      await assert.rejects(forceConstraints(executor), { code: "23514" });
    });
    await checkpoint(executor, async () => {
      // Attachment to an already submitted file-free application is independently checked.
      await attachMetadata(executor, result.id); await assert.rejects(forceConstraints(executor), { code: "23514" });
    });
    // Immediate constraints must inspect the changed file, not the BEFORE-trigger snapshot.
    for (const timing of ['ALL', '"Application_submission_evidence"']) {
      await checkpoint(executor, async () => {
        await executor.query(`SET CONSTRAINTS ${timing} IMMEDIATE`);
        await assert.rejects(attachMetadata(executor, result.id), { code: "23514" });
      });
      await checkpoint(executor, async () => {
        const id = await rawApplication(executor, true);
        const fileId = await attachMetadata(executor, id, true);
        await markSubmitted(executor, id);
        await executor.query(`SET CONSTRAINTS ${timing} IMMEDIATE`);
        await assert.rejects(executor.query(`UPDATE public."CandidateFile"
          SET "securityStatus" = 'UNREVIEWED', "clearanceMethod" = NULL, "clearedAt" = NULL WHERE "id" = $1`, [fileId]), { code: "23514" });
      });
    }
    await checkpoint(executor, async () => {
      const id = await rawApplication(executor, true); const fileId = await attachMetadata(executor, id, true);
      await markSubmitted(executor, id); await forceConstraints(executor);
      await executor.query(`UPDATE public."CandidateFile" SET "securityStatus" = 'UNREVIEWED', "clearanceMethod" = NULL, "clearedAt" = NULL WHERE "id" = $1`, [fileId]);
      await assert.rejects(forceConstraints(executor), { code: "23514" });
    });
    await checkpoint(executor, async () => {
      const id = await rawApplication(executor, true); await attachMetadata(executor, id, true); await markSubmitted(executor, id); await forceConstraints(executor);
      await executor.query(`DELETE FROM public."CandidateFile" WHERE "applicationId" = $1`, [id]).then(() => forceConstraints(executor)).then(() => assert.fail("Required file deletion accepted"), (error) => assert(["23514", "23503"].includes(error.code)));
    });
    await checkpoint(executor, async () => {
      await assert.rejects(executor.query(`UPDATE public."Application" SET "requiresClearedFile" = true WHERE "id" = $1`, [result.id]), { code: "55000" });
    });
    await checkpoint(executor, async () => {
      const now = Date.now() + 120_000;
      for (let i = 0; i < 20; i++) assert(await intake.consumeIntakeLimit(executor, now));
      for (let i = 0; i < 5; i++) assert.equal(await intake.consumeIntakeLimit(executor, now), false);
      assert(await intake.consumeIntakeLimit(executor, now + 60_001));
      const limiter = (await executor.query(`SELECT "count", "keyDigest" FROM public."RateLimitBucket" WHERE "scope" = 'PUBLIC_INTAKE_GLOBAL'`)).rows;
      assert.equal(limiter.length, 1); assert.match(limiter[0].keyDigest, /^[a-f0-9]{64}$/);
    });
    process.env.PUBLIC_INTAKE_MODE = "synthetic";
    process.env.NODE_ENV = "test";
    const request = (data, headers = {}) => new Request("http://localhost:3000/api/applications", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/x-www-form-urlencoded", ...headers }, body: data.toString() });
    const dependencies = { transaction: (work) => work(executor), consumeLimit: async () => true };
    await checkpoint(executor, async () => {
      const response = await intake.handleIntakeRequest(request(talent()), dependencies);
      assert.equal(response.status, 200); assert.deepEqual(Object.keys(await response.json()).sort(), ["message", "ok"]);
      assert.match(response.headers.get("cache-control"), /no-store/); await forceConstraints(executor);
    });
    for (const [headers, status] of [[{ origin: "https://evil.example.invalid" },403], [{ origin: "" },403], [{ "sec-fetch-site": "cross-site" },403], [{ "content-type": "application/json" },415], [{ "content-length": "30000" },413]]) {
      assert.equal((await intake.handleIntakeRequest(request(payload(), headers), dependencies)).status, status); checks++;
    }
    await checkpoint(executor, async () => {
      const alias = request(talent(), { origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000", "x-forwarded-for": "203.0.113.1", "x-forwarded-host": "evil.example.invalid" });
      assert.equal((await intake.handleIntakeRequest(alias, dependencies)).status, 200);
      await forceConstraints(executor);
      assert.equal((await intake.handleIntakeRequest(request(payload(), { origin: "http://localhost:3000", host: "evil.example.invalid" }), dependencies)).status, 403);
    });
    assert.equal((await intake.handleIntakeRequest(request(payload({ fullName: "x".repeat(25000) })), dependencies)).status, 413); checks++;
    assert.equal((await intake.handleIntakeRequest(request(payload()), { ...dependencies, consumeLimit: async () => false })).status, 429); checks++;
    const failure = await intake.handleIntakeRequest(request(payload()), { ...dependencies, consumeLimit: async () => { throw new Error("private provider error"); } });
    assert.equal(failure.status, 503); assert(!(await failure.text()).includes("private provider")); checks++;
    assert.equal(intake.syntheticIntakeEnabled("https://pyramiddesigns.example.invalid"), false);
    for (const environment of ["production", "", "preview"]) {
      process.env.NODE_ENV = environment;
      assert.equal(intake.syntheticIntakeEnabled("http://localhost:3000"), false);
      assert.equal((await intake.handleIntakeRequest(request(payload()), {
        transaction: () => assert.fail("Closed intake accessed the database"),
        consumeLimit: () => assert.fail("Closed intake consumed a limit"),
      })).status, 403);
      checks++;
    }
    process.env.NODE_ENV = "test";
    delete process.env.PUBLIC_INTAKE_MODE;
    assert.equal((await intake.handleIntakeRequest(request(payload()), dependencies)).status, 403); checks++;
    const security = (await executor.query(`SELECT count(*)::int AS failures FROM pg_tables WHERE schemaname = 'public' AND
      (NOT rowsecurity OR has_table_privilege('anon', format('%I.%I', schemaname, tablename), 'SELECT,INSERT,UPDATE,DELETE')
      OR has_table_privilege('authenticated', format('%I.%I', schemaname, tablename), 'SELECT,INSERT,UPDATE,DELETE'))`)).rows[0];
    assert.equal(security.failures, 0);
    assert.equal((await executor.query(`SELECT count(*)::int AS count FROM pg_policies WHERE schemaname = 'public'`)).rows[0].count, 0); checks++;
    completed = true; throw new Error("Synthetic verification rollback");
    } catch (error) { if (!completed) { console.error(`PHASE2G_CHECK_FAILED checks=${checks} code=${error.code ?? error.name}`); console.error(error.stack?.split("\n").filter((line) => line.trim().startsWith("at ")).join("\n")); } throw error; }
  }), { name: "DatabaseTransactionError" });
  assert(completed, "Verification aborted before completing its matrix");
  assert.deepEqual(await counts(db.database), original, "Synthetic transaction left persistent domain data");
  // Two actual database sessions: a rapid duplicate waits, then recovers after an aborted first attempt.
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const first = await pool.connect(), second = await pool.connect();
  let secondWork;
  try {
    await first.query("BEGIN"); await second.query("BEGIN");
    await first.query("SET LOCAL statement_timeout = '15s'"); await second.query("SET LOCAL statement_timeout = '15s'");
    const data = payload();
    const abandoned = await intake.submitIntake(data, first);
    const secondPid = (await second.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
    secondWork = intake.submitIntake(data, second);
    secondWork.catch(() => {});
    let blocked = false;
    for (let attempt = 0; attempt < 20 && !blocked; attempt++) {
      await first.query("SELECT pg_sleep(0.1)");
      blocked = (await first.query("SELECT cardinality(pg_blocking_pids($1)) > 0 AS blocked", [secondPid])).rows[0].blocked;
    }
    assert.equal(blocked, true);
    await first.query("ROLLBACK");
    const recovered = await secondWork;
    assert.notEqual(recovered.id, abandoned.id);
    assert.equal(recovered.technicalStatus, "SUBMITTED");
    await forceConstraints(second);
    assert.equal((await intake.submitIntake(data, second)).id, recovered.id);
    checks++;
  } finally {
    await first.query("ROLLBACK");
    if (secondWork) await secondWork.catch(() => {});
    await second.query("ROLLBACK"); first.release(); second.release(); await pool.end();
  }
  assert.deepEqual(await counts(db.database), original, "Concurrent verification left persistent domain data");
  const route = await readFile("src/app/api/applications/route.ts", "utf8");
  assert(!/export (?:async )?function GET|export const GET/.test(route));
  const source = await readFile("src/lib/server/public-intake.ts", "utf8");
  assert(!/console\.(log|error)|x-forwarded-for|x-real-ip|PrismaClient/.test(source));
  const form = await readFile("src/components/join/JoinFormPrototype.tsx", "utf8");
  assert(!/type="file"|demo=success|localStorage|sessionStorage|dangerouslySetInnerHTML/.test(form));
  console.log(`PHASE_2G_PUBLIC_INTAKE_OK checks=${checks} rollback=verified`);
} finally { await db.closeDatabasePool(); }
