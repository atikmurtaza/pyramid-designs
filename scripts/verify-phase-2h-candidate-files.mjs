import assert from "node:assert/strict";
import { installChallengeFixture, challengedFields } from "./phase-2ie-challenge-fixture.mjs";
import { randomUUID } from "node:crypto";
import { deflateSync } from "node:zlib";
import { syntheticPdf } from "./phase-2h-synthetic-pdf.mjs";
import { verifyGoogleAdapter } from "./verify-phase-2h-google-adapter.mjs";

import { config } from "dotenv";
import pg from "pg";

import { phase2BFixtures as f } from "./seed-phase-2b-synthetic.mjs";
import { phase2CFixtures, seedPhase2CSynthetic } from "./seed-phase-2c-synthetic.mjs";

config({ path: ".env.local", quiet: true });
process.env.NODE_ENV = "test";
process.env.PUBLIC_INTAKE_MODE = "synthetic";
installChallengeFixture();
assert.equal(Number(process.versions.node.split(".")[0]), 22);

const db = await import("../src/lib/server/database.ts");
const policy = await import("../src/lib/server/candidate-file-policy.ts");
const files = await import("../src/lib/server/candidate-files.ts");
const drive = await import("../src/lib/server/google-drive.ts");
const intake = await import("../src/lib/server/public-intake.ts");

let checks = 0;
const check = (value, expected = true) => { assert.deepEqual(value, expected); checks++; };

function payload(idempotencyKey = randomUUID(), overrides = {}) {
  return new URLSearchParams({ applicationType: "JOB_APPLICATION", jobId: f.jobId,
    fullName: "Synthetic Phase 2H Candidate", email: "synthetic.phase2h@example.invalid", city: "Synthetic City",
    experienceLevel: "SYNTHETIC_LEVEL", consentDefinitionId: f.consentDefinitionId, consent: "accepted",
    idempotencyKey, [`answer.${f.jobQuestionId}`]: f.jobQuestionOptionId, ...overrides });
}

function uploadRequest(fields = payload(), bytes = validPdf, name = "Transient Synthetic CV.pdf", origin = "http://localhost") {
  const form = new FormData();
  for (const [field, value] of challengedFields(fields)) form.append(field, value);
  form.append("cv", new File([bytes], name, { type: "application/pdf" }));
  return new Request(`${origin}/api/applications`, { method: "POST", body: form,
    headers: { host: new URL(origin).host, origin, "sec-fetch-site": "same-origin" } });
}

class FakeStorage {
  objects = new Map();
  failNextPut = false;
  lastPutId;
  async allocateId() { return `syntheticDrive${randomUUID().replaceAll("-", "")}`; }
  async put(id, name, bytes, digest) {
    this.lastPutId = id;
    if (this.failNextPut) { this.failNextPut = false; throw new Error("synthetic storage failure"); }
    const existing = this.objects.get(id);
    if (existing && (existing.name !== name || existing.digest !== digest || !existing.bytes.equals(bytes))) throw new Error("synthetic storage mismatch");
    this.objects.set(id, { name, digest, bytes: Buffer.from(bytes) });
  }
  async get(id) {
    const object = this.objects.get(id);
    if (!object) throw new Error("synthetic storage missing");
    return Buffer.from(object.bytes);
  }
  async delete(id) { this.objects.delete(id); }
}

async function expectedFailure(executor, work) {
  const savepoint = `phase2h_${randomUUID().replaceAll("-", "")}`;
  await executor.query(`SAVEPOINT ${savepoint}`);
  let failed = false;
  try { await work(); await executor.query("SET CONSTRAINTS ALL IMMEDIATE"); }
  catch { failed = true; }
  await executor.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
  await executor.query(`RELEASE SAVEPOINT ${savepoint}`);
  await executor.query("SET CONSTRAINTS ALL DEFERRED");
  check(failed);
}

const validPdf = syntheticPdf();
try {
  checks += await verifyGoogleAdapter();
  await seedPhase2CSynthetic();

  check(policy.validateCandidatePdf(validPdf, "Synthetic CV.pdf", "application/pdf").detectedMime, "application/pdf");
  for (const [bytes, name, mime] of [
    [Buffer.alloc(0), "Synthetic.pdf", "application/pdf"],
    [Buffer.alloc(policy.MAX_CV_BYTES + 1), "Synthetic.pdf", "application/pdf"],
    [validPdf, "Synthetic.docx", "application/pdf"],
    [validPdf, "Synthetic.pdf", "application/msword"],
    [Buffer.from("not a pdf"), "Synthetic.pdf", "application/pdf"],
    [Buffer.from("%PDF-1.4\n1 0 obj\n%%EOF\n"), "Synthetic.pdf", "application/pdf"],
    [validPdf, "../Synthetic.pdf", "application/pdf"],
    [validPdf, "C:\\fakepath\\Synthetic.pdf", "application/pdf"],
  ]) assert.throws(() => policy.validateCandidatePdf(bytes, name, mime), { name: "CandidateFileUnavailable" }), checks++;
  assert.throws(() => policy.validateCandidatePdf(Buffer.concat([validPdf, Buffer.from("MZ")]), "Synthetic.pdf", "application/pdf"), { name: "CandidateFileUnavailable" }); checks++;
  assert.throws(() => policy.validateCandidatePdf(syntheticPdf("/OpenAction 5 0 R"), "Synthetic.pdf", "application/pdf"), { name: "CandidateFileUnavailable" }); checks++;
  for (const filter of ["/FlateDecode", "[/FlateDecode]", "/Fl", "/Flate#44ecode"]) {
    assert.throws(() => policy.validateCandidatePdf(syntheticPdf("", { filter,
      stream: deflateSync(Buffer.from("/JavaScript synthetic")) }), "Synthetic.pdf", "application/pdf"), { name: "CandidateFileUnavailable" }); checks++;
  }
  check(policy.validateCandidatePdf(syntheticPdf("", { filter: "[/FlateDecode]",
    stream: deflateSync(Buffer.from("Synthetic harmless stream")) }), "Synthetic.pdf", "application/pdf").detectedMime, "application/pdf");
  for (const options of [
    { filter: "/FlateDecode", stream: deflateSync(Buffer.alloc(policy.MAX_CV_BYTES + 1, 65)) },
    { filter: "/FlateDecode", stream: Buffer.from("invalid flate") },
    { filter: "[/ASCII85Decode /FlateDecode]", stream: Buffer.from("unsupported chain") },
  ]) { assert.throws(() => policy.validateCandidatePdf(syntheticPdf("", options), "Synthetic.pdf", "application/pdf"), { name: "CandidateFileUnavailable" }); checks++; }
  const parserStarted = performance.now();
  policy.validateCandidatePdf(syntheticPdf("<".repeat(1_000_000)), "Synthetic.pdf", "application/pdf");
  check(performance.now() - parserStarted < 2000);
  check(policy.sha256(validPdf), policy.sha256(Buffer.from(validPdf)));
  check(policy.sha256(validPdf) === policy.sha256(Buffer.concat([validPdf, Buffer.from([0])])), false);

  const multipart = new FormData();
  for (const [name, value] of payload()) multipart.append(name, value);
  multipart.append("cv", new File([validPdf], "Transient Synthetic CV.pdf", { type: "application/pdf" }));
  const parsed = await policy.parseCandidateUpload(new Request("http://localhost/api/applications", { method: "POST", body: multipart }));
  check(parsed.contentHash, policy.sha256(validPdf));
  check(JSON.stringify(parsed).includes("Transient Synthetic CV.pdf"), false);
  const fixedDownload = files.candidateFileResponse(validPdf);
  check(fixedDownload.headers.get("content-disposition"), 'attachment; filename="candidate-cv.pdf"');
  check(fixedDownload.headers.get("cache-control")?.includes("no-store"));
  const googleKeys = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "GOOGLE_DRIVE_ROOT_ID"];
  const savedGoogle = Object.fromEntries(googleKeys.map((key) => [key, process.env[key]]));
  const savedNodeMode = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    for (const key of googleKeys) delete process.env[key];
    check(drive.googleStorageConfigured(), false);
    assert.throws(() => drive.googleDriveStorage(), { name: "CandidateFileUnavailable" }); checks++;
    for (const missing of googleKeys) {
      for (const key of googleKeys) process.env[key] = "synthetic-config-only";
      delete process.env[missing];
      check(drive.googleStorageConfigured(), false);
      assert.throws(() => drive.googleDriveStorage(), { name: "CandidateFileUnavailable" }); checks++;
    }
  } finally {
    process.env.NODE_ENV = savedNodeMode;
    for (const key of googleKeys) {
      if (savedGoogle[key] === undefined) delete process.env[key];
      else process.env[key] = savedGoogle[key];
    }
  }
  const crossOrigin = await files.handleCandidateFileIntakeRequest(uploadRequest(payload(), validPdf, "Synthetic.pdf", "http://attacker.invalid"), { consumeLimit: async () => true, storage: () => new FakeStorage() });
  check(crossOrigin.status, 403);
  const missingFile = new FormData(); for (const [name, value] of payload()) missingFile.append(name, value);
  const missingResponse = await files.handleCandidateFileIntakeRequest(new Request("http://localhost/api/applications", { method: "POST", body: missingFile,
    headers: { host: "localhost", origin: "http://localhost", "sec-fetch-site": "same-origin" } }), { consumeLimit: async () => true, storage: () => new FakeStorage() });
  check(missingResponse.status, 400);

  let rolledBack = false;
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10_000 });
  await client.connect();
  try {
      await client.query("BEGIN");
      const executor = { query: (text, values = []) => client.query(text, values) };
      let transactionNumber = 0;
      const run = async (work) => {
        const savepoint = `phase2h_transaction_${++transactionNumber}`;
        await executor.query(`SAVEPOINT ${savepoint}`);
        try {
          const result = await work(executor);
          await executor.query(`RELEASE SAVEPOINT ${savepoint}`);
          return result;
        } catch (error) {
          await executor.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
          await executor.query(`RELEASE SAVEPOINT ${savepoint}`);
          throw error;
        }
      };
      const storage = new FakeStorage();
      const manager = { authSubjectId: phase2CFixtures.subjects.manager, staffUserId: phase2CFixtures.managerStaffId, assuranceLevel: "aal2", roles: ["HIRING_MANAGER"] };
      const reviewer = { authSubjectId: phase2CFixtures.subjects.reviewer, staffUserId: phase2CFixtures.reviewerStaffId, assuranceLevel: "aal2", roles: ["HIRING_REVIEWER"] };
      const auditor = { authSubjectId: phase2CFixtures.subjects.auditor, staffUserId: phase2CFixtures.auditorStaffId, assuranceLevel: "aal2", roles: ["AUDITOR"] };

      const key = randomUUID();
      const application = await files.storeCandidateApplication(payload(key), validPdf, policy.sha256(validPdf), validPdf.length, storage, run);
      const stored = (await executor.query(`SELECT file.*, application."technicalStatus" AS "applicationStatus"
        FROM public."CandidateFile" file JOIN public."Application" application ON application."id" = file."applicationId"
        WHERE file."applicationId" = $1`, [application.id])).rows[0];
      check(stored.applicationStatus, "SECURITY_PENDING");
      check(stored.technicalStatus, "QUARANTINED");
      check(stored.securityStatus, "UNREVIEWED");
      check(stored.validationStatus, "PASSED");
      check(stored.contentHash, policy.sha256(validPdf));
      check(/^[a-f0-9-]+\.pdf$/.test(stored.storedFilename));
      check(JSON.stringify(stored).includes("Transient Synthetic CV.pdf"), false);
      check((await executor.query(`SELECT "state" FROM public."BackgroundJob" WHERE "candidateFileId" = $1`, [stored.id])).rows[0].state, "SUCCEEDED");
      await expectedFailure(executor, () => executor.query(`UPDATE public."Application" SET "technicalStatus" = 'SUBMITTED',
        "hiringStatus" = 'NEW', "submittedAt" = clock_timestamp() WHERE "id" = $1`, [application.id]));

      const handlerStorage = new FakeStorage();
      const handlerResponse = await files.handleCandidateFileIntakeRequest(uploadRequest(), { consumeLimit: async () => true,
        storage: () => handlerStorage, runTransaction: run });
      check(handlerResponse.status, 200);
      check((await handlerResponse.json()).message.includes("not cleared or trusted"));

      const duplicate = await files.storeCandidateApplication(payload(key), validPdf, policy.sha256(validPdf), validPdf.length, storage, run);
      check(duplicate.id, application.id);
      check(Number((await executor.query(`SELECT count(*) FROM public."CandidateFile" WHERE "applicationId" = $1`, [application.id])).rows[0].count), 1);
      await assert.rejects(() => files.storeCandidateApplication(payload(key), syntheticPdf("changed"), policy.sha256(syntheticPdf("changed")), syntheticPdf("changed").length, storage, run)); checks++;
      await assert.rejects(() => intake.submitIntake(payload(randomUUID(), { applicationId: application.id }), executor)); checks++;

      await assert.rejects(() => files.retrieveCandidateFile(reviewer, stored.id, "candidate_file.cleared.download", storage, executor, run)); checks++;
      await assert.rejects(() => files.retrieveCandidateFile(reviewer, stored.id, "candidate_file.security_review.retrieve_quarantine", storage, executor, run)); checks++;
      check((await files.retrieveCandidateFile(manager, stored.id, "candidate_file.security_review.retrieve_quarantine", storage, executor, run)).equals(validPdf));
      await assert.rejects(() => files.retrieveCandidateFile(auditor, stored.id, "candidate_file.security_review.retrieve_quarantine", storage, executor, run)); checks++;
      await assert.rejects(() => files.retrieveCandidateFile({ ...manager, assuranceLevel: "aal1" }, stored.id, "candidate_file.security_review.retrieve_quarantine", storage, executor, run)); checks++;
      await assert.rejects(() => files.retrieveCandidateFile(null, stored.id, "candidate_file.security_review.retrieve_quarantine", storage, executor, run)); checks++;
      await assert.rejects(() => files.retrieveCandidateFile(manager, randomUUID(), "candidate_file.security_review.retrieve_quarantine", storage, executor, run)); checks++;

      await files.initiateCandidateFileReview(manager, stored.id, run);
      await assert.rejects(() => files.recordCandidateFileReview(manager, stored.id, {
        observedSha256: "f".repeat(64), outcome: "CLEAN", startedAt: new Date().toISOString(), idempotencyKey: randomUUID(),
      }, run)); checks++;
      const reviewKey = randomUUID();
      await files.recordCandidateFileReview(manager, stored.id, { observedSha256: stored.contentHash, outcome: "CLEAN",
        toolVersion: "Synthetic Defender Test Version", startedAt: new Date().toISOString(), idempotencyKey: reviewKey }, run);
      await files.recordCandidateFileReview(manager, stored.id, { observedSha256: stored.contentHash, outcome: "CLEAN",
        toolVersion: "Synthetic Defender Test Version", startedAt: new Date().toISOString(), idempotencyKey: reviewKey }, run);
      const cleared = (await executor.query(`SELECT file."securityStatus", application."technicalStatus", application."hiringStatus"
        FROM public."CandidateFile" file JOIN public."Application" application ON application."id" = file."applicationId" WHERE file."id" = $1`, [stored.id])).rows[0];
      check(cleared.securityStatus, "CLEARED");
      check(cleared.technicalStatus, "SUBMITTED");
      check(cleared.hiringStatus, "NEW");
      check((await files.retrieveCandidateFile(reviewer, stored.id, "candidate_file.cleared.download", storage, executor, run)).equals(validPdf));
      await executor.query("SAVEPOINT phase2h_during_fetch");
      await assert.rejects(() => files.retrieveCandidateFile(reviewer, stored.id, "candidate_file.cleared.download", {
        ...storage, get: async (id) => {
          const bytes = await storage.get(id);
          await executor.query(`UPDATE public."UserRole" SET "revokedAt" = clock_timestamp() WHERE "staffUserId" = $1`, [reviewer.staffUserId]);
          return bytes;
        },
      }, executor, run)); checks++;
      await executor.query("ROLLBACK TO SAVEPOINT phase2h_during_fetch");
      await executor.query("RELEASE SAVEPOINT phase2h_during_fetch");

      await executor.query(`UPDATE public."StaffUser" SET "status" = 'DISABLED', "disabledAt" = clock_timestamp() WHERE "id" = $1`, [phase2CFixtures.reviewerStaffId]);
      await assert.rejects(() => files.retrieveCandidateFile(reviewer, stored.id, "candidate_file.cleared.download", storage, executor, run)); checks++;
      await executor.query(`UPDATE public."StaffUser" SET "status" = 'ACTIVE', "disabledAt" = NULL WHERE "id" = $1`, [phase2CFixtures.reviewerStaffId]);
      await executor.query(`UPDATE public."UserRole" SET "revokedAt" = clock_timestamp() WHERE "staffUserId" = $1 AND "roleCode" = 'HIRING_REVIEWER'`, [phase2CFixtures.reviewerStaffId]);
      await assert.rejects(() => files.retrieveCandidateFile(reviewer, stored.id, "candidate_file.cleared.download", storage, executor, run)); checks++;
      await executor.query(`UPDATE public."UserRole" SET "revokedAt" = NULL WHERE "staffUserId" = $1 AND "roleCode" = 'HIRING_REVIEWER'`, [phase2CFixtures.reviewerStaffId]);

      await expectedFailure(executor, () => executor.query(`UPDATE public."CandidateFile" SET "securityStatus" = 'UNREVIEWED',
        "clearanceMethod" = NULL, "clearedAt" = NULL WHERE "id" = $1`, [stored.id]));
      await expectedFailure(executor, () => executor.query(`UPDATE public."CandidateFile" SET "contentHash" = $2 WHERE "id" = $1`, [stored.id, "e".repeat(64)]));
      await expectedFailure(executor, () => executor.query(`UPDATE public."FileSecurityReview" SET "outcomeCode" = 'CHANGED' WHERE "idempotencyKey" = $1`, [reviewKey]));
      await expectedFailure(executor, () => executor.query(`DELETE FROM public."FileSecurityReview" WHERE "idempotencyKey" = $1`, [reviewKey]));

      const failedStorage = new FakeStorage(); failedStorage.failNextPut = true;
      const failedKey = randomUUID();
      try { await files.storeCandidateApplication(payload(failedKey), validPdf, policy.sha256(validPdf), validPdf.length, failedStorage, run); assert.fail("expected storage failure"); }
      catch (error) { if (!failedStorage.lastPutId) throw error; checks++; }
      check(typeof failedStorage.lastPutId, "string");
      const pending = (await executor.query(`SELECT file."id", file."technicalStatus", job."state" FROM public."CandidateFile" file
        JOIN public."BackgroundJob" job ON job."candidateFileId" = file."id" WHERE file."driveFileId" = $1`, [failedStorage.lastPutId])).rows[0];
      check(pending.technicalStatus, "UPLOAD_PENDING"); check(pending.state, "RUNNING");
      // Phase 2I-B uploader ownership survives an ambiguous provider failure.
      await assert.rejects(() => files.storeCandidateApplication(payload(failedKey), validPdf, policy.sha256(validPdf), validPdf.length, failedStorage, run)); checks++;
      await expectedFailure(executor, () => executor.query(`INSERT INTO public."CandidateFile" ("id", "applicationId", "driveFileId", "storedFilename",
        "extension", "declaredMime", "detectedMime", "sizeBytes", "contentHash", "validationStatus", "updatedAt")
        VALUES ($1, (SELECT "applicationId" FROM public."CandidateFile" WHERE "id" = $2), $3, $4, 'pdf', 'application/pdf',
        'application/pdf', 100, $5, 'PASSED', clock_timestamp())`, [randomUUID(), pending.id, `syntheticDrive${randomUUID().replaceAll("-", "")}`, `${randomUUID()}.pdf`, "b".repeat(64)]));
      await executor.query(`UPDATE public."BackgroundJob" SET "leaseUntil" = clock_timestamp() - interval '1 second' WHERE "candidateFileId" = $1`, [pending.id]);
      await files.storeCandidateApplication(payload(failedKey), validPdf, policy.sha256(validPdf), validPdf.length, failedStorage, run);

      const splitStorage = new FakeStorage();
      const splitKey = randomUUID();
      await assert.rejects(() => files.storeCandidateApplication(payload(splitKey), validPdf, policy.sha256(validPdf), validPdf.length, splitStorage,
        async (work) => work({ query: (sql, values) => {
          if (sql.includes('SET "technicalStatus" = \'QUARANTINED\'')) throw new Error("synthetic database finalization failure");
          return executor.query(sql, values);
        } }))); checks++;
      const split = (await executor.query(`SELECT file."id", file."driveFileId", file."technicalStatus", job."state" FROM public."CandidateFile" file
        JOIN public."BackgroundJob" job ON job."candidateFileId" = file."id" JOIN public."Application" application ON application."id" = file."applicationId"
        WHERE application."technicalStatus" = 'SUBMISSION_PENDING' ORDER BY application."createdAt" DESC LIMIT 1`)).rows[0];
      check(split.technicalStatus, "UPLOAD_PENDING"); check(split.state, "RUNNING"); check(splitStorage.objects.has(split.driveFileId));
      await executor.query(`UPDATE public."BackgroundJob" SET "leaseUntil" = clock_timestamp() - interval '1 second' WHERE "candidateFileId" = $1`, [split.id]);
      await files.storeCandidateApplication(payload(splitKey), validPdf, policy.sha256(validPdf), validPdf.length, splitStorage, run);

      const rejectedStorage = new FakeStorage();
      const rejectedApp = await files.storeCandidateApplication(payload(), validPdf, policy.sha256(validPdf), validPdf.length, rejectedStorage, run);
      const rejectedFile = (await executor.query(`SELECT "id", "contentHash" FROM public."CandidateFile" WHERE "applicationId" = $1`, [rejectedApp.id])).rows[0];
      await expectedFailure(executor, () => executor.query(`UPDATE public."CandidateFile" SET "applicationId" = $2 WHERE "id" = $1`, [stored.id, rejectedApp.id]));
      await files.initiateCandidateFileReview(manager, rejectedFile.id, run);
      await files.recordCandidateFileReview(manager, rejectedFile.id, { observedSha256: rejectedFile.contentHash, outcome: "REJECTED",
        startedAt: new Date().toISOString(), idempotencyKey: randomUUID() }, run);
      check((await executor.query(`SELECT "securityStatus" FROM public."CandidateFile" WHERE "id" = $1`, [rejectedFile.id])).rows[0].securityStatus, "REJECTED");
      await assert.rejects(() => files.retrieveCandidateFile(reviewer, rejectedFile.id, "candidate_file.cleared.download", rejectedStorage, executor, run)); checks++;
      await expectedFailure(executor, () => executor.query(`UPDATE public."Application" SET "technicalStatus" = 'SUBMITTED',
        "hiringStatus" = 'NEW', "submittedAt" = clock_timestamp() WHERE "id" = $1`, [rejectedApp.id]));

      const unavailableStorage = new FakeStorage();
      const unavailableApp = await files.storeCandidateApplication(payload(), validPdf, policy.sha256(validPdf), validPdf.length, unavailableStorage, run);
      const unavailableFile = (await executor.query(`SELECT "id", "contentHash" FROM public."CandidateFile" WHERE "applicationId" = $1`, [unavailableApp.id])).rows[0];
      await files.initiateCandidateFileReview(manager, unavailableFile.id, run);
      await files.recordCandidateFileReview(manager, unavailableFile.id, { observedSha256: unavailableFile.contentHash, outcome: "FAILED",
        startedAt: new Date().toISOString(), idempotencyKey: randomUUID() }, run);
      check((await executor.query(`SELECT "securityStatus" FROM public."CandidateFile" WHERE "id" = $1`, [unavailableFile.id])).rows[0].securityStatus, "REVIEW_FAILED");

      const noFile = await intake.submitIntake(payload(), executor);
      check(noFile.technicalStatus, "SUBMITTED");
      check((await executor.query(`SELECT "requiresClearedFile" FROM public."Application" WHERE "id" = $1`, [noFile.id])).rows[0].requiresClearedFile, false);
      await expectedFailure(executor, () => executor.query(`INSERT INTO public."CandidateFile" ("id", "applicationId", "storedFilename", "extension",
        "declaredMime", "detectedMime", "sizeBytes", "contentHash", "validationStatus", "technicalStatus", "updatedAt")
        VALUES ($1, $2, $3, 'pdf', 'application/pdf', 'application/pdf', 100, $4, 'PASSED', 'QUARANTINED', clock_timestamp())`,
      [randomUUID(), noFile.id, `${randomUUID()}.pdf`, "a".repeat(64)]));

      const emptyApp = await executor.query(`INSERT INTO public."Application" ("id", "publicReference", "applicationType", "departmentId",
        "engagementType", "fullName", "email", "city", "experienceLevel", "source", "retentionPolicyId", "expiresAt", "updatedAt", "requiresClearedFile")
        VALUES ($1, $2, 'TALENT_NETWORK', $3, 'PERMANENT_INTEREST', 'Synthetic Empty', 'synthetic.empty@example.invalid', 'Synthetic City',
        'SYNTHETIC_LEVEL', 'SYNTHETIC_TEST', $4, clock_timestamp() + interval '30 days', clock_timestamp(), true) RETURNING "id"`,
      [randomUUID(), `PD-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`, f.departmentId, f.retentionPolicyId]);
      await executor.query(`INSERT INTO public."CandidateConsent" ("id", "applicationId", "consentDefinitionId", "decision", "source", "requestId")
        VALUES ($1, $2, $3, 'ACCEPTED', 'TALENT_FORM', 'synthetic-phase2h-empty')`, [randomUUID(), emptyApp.rows[0].id, f.consentDefinitionId]);
      await expectedFailure(executor, () => executor.query(`UPDATE public."Application" SET "technicalStatus" = 'SUBMITTED', "hiringStatus" = 'NEW',
        "submittedAt" = clock_timestamp() WHERE "id" = $1`, [emptyApp.rows[0].id]));

      const privacy = await executor.query(`SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
        AND table_name='CandidateFile' AND column_name IN ('originalFilename','displayFilename')) AS "filenameColumn",
        EXISTS (SELECT 1 FROM public."AuditEvent" WHERE "safeMetadata"::text ILIKE '%Transient Synthetic CV.pdf%') AS "auditLeak",
        EXISTS (SELECT 1 FROM public."BackgroundJob" WHERE "safePayload"::text ILIKE '%Transient Synthetic CV.pdf%') AS "jobLeak"`);
      check(privacy.rows[0], { filenameColumn: false, auditLeak: false, jobLeak: false });
      await storage.delete(stored.driveFileId); check(storage.objects.has(stored.driveFileId), false);

      await client.query("ROLLBACK");
      rolledBack = true;
  } finally { if (!rolledBack) await client.query("ROLLBACK").catch(() => {}); await client.end(); }
  check(rolledBack);
  console.log(`PHASE_2H_CANDIDATE_FILES_OK checks=${checks} rollback=verified`);
} finally {
  await db.closeDatabasePool();
}
