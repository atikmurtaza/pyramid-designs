import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

// Hard boundary: this suite commits synthetic state and requires a named disposable DB.
const url = new URL(process.env.PHASE2IB_TEST_DATABASE_URL ?? "invalid:");
assert(["localhost", "127.0.0.1"].includes(url.hostname) && /^\/phase2ib_[a-z0-9_]+$/.test(url.pathname));
process.env.DATABASE_URL = url.href;
process.env.NODE_ENV = "test";
process.env.PUBLIC_INTAKE_MODE = "synthetic";
assert.equal(Number(process.versions.node.split(".")[0]), 22);
const db = await import("../src/lib/server/database.ts");
const jobs = await import("../src/lib/server/repositories/background-jobs.ts");
const worker = await import("../src/lib/server/background-worker.ts");
const files = await import("../src/lib/server/candidate-files.ts");
const intake = await import("../src/lib/server/public-intake.ts");
const policy = await import("../src/lib/server/candidate-file-policy.ts");
const { StorageOperationError } = await import("../src/lib/server/google-drive.ts");
const { handleWorkerTrigger } = await import("../src/lib/server/worker-trigger.ts");
const { phase2BFixtures: f } = await import("./seed-phase-2b-synthetic.mjs");
const { phase2CFixtures: staff, seedPhase2CSynthetic } = await import("./seed-phase-2c-synthetic.mjs");
const { syntheticPdf } = await import("./phase-2h-synthetic-pdf.mjs");
const { verifyWorkerGoogleAdapter } = await import("./verify-phase-2ib-google-adapter.mjs");
let checks = 0;
const check = (value, expected = true) => { assert.deepEqual(value, expected); checks++; };
const rejects = async (fn) => { await assert.rejects(fn); checks++; };
const manager = { staffUserId: staff.managerStaffId, authSubjectId: staff.subjects.manager, roles: ["HIRING_MANAGER"], assuranceLevel: "aal2" };
const bytes = syntheticPdf();
const digest = policy.sha256(bytes);
class Storage {
  objects = new Map(); verifies = 0; erases = 0; onErase; onPut;
  async allocateId() { return `syntheticDrive${randomUUID().replaceAll("-", "")}`; }
  async put(id, name, data, hash) {
    if (this.onPut) await this.onPut(id);
    const existing = this.objects.get(id);
    if (existing && (existing.digest !== hash || existing.name !== name)) throw new StorageOperationError("SECURITY");
    this.objects.set(id, { id, name, size: data.length, digest: hash, bytes: Buffer.from(data) });
  }
  async get(id) { return this.objects.get(id)?.bytes ?? Promise.reject(new Error("Synthetic absent")); }
  async delete(id) { this.objects.delete(id); }
  async verify(expected) {
    this.verifies++;
    const item = this.objects.get(expected.id);
    if (!item) return false;
    if (item.name !== expected.name || item.size !== expected.size || item.digest !== expected.digest || item.unsafe) throw new StorageOperationError("SECURITY");
    return true;
  }
  async erase(expected) {
    this.erases++;
    if (this.onErase) await this.onErase(expected);
    await this.verify(expected);
    this.objects.delete(expected.id);
  }
}
const storage = new Storage();
function fields(portfolio = false) {
  return new URLSearchParams({ applicationType: "TALENT_NETWORK", departmentId: f.departmentId,
    engagementType: portfolio ? "PORTFOLIO_INTRODUCTION" : "PERMANENT_INTEREST",
    fullName: "Synthetic Worker Candidate", email: "synthetic.worker@example.invalid", city: "Synthetic City",
    experienceLevel: "Synthetic free text to erase", portfolioUrl: "https://example.invalid/synthetic-portfolio",
    consentDefinitionId: f.consentDefinitionId, consent: "accepted", idempotencyKey: randomUUID() });
}
async function fixture({ clear = false, file = true, portfolio = false } = {}) {
  const data = fields(portfolio);
  const application = file ? await files.storeCandidateApplication(data, bytes, digest, bytes.length, storage)
    : await db.transaction(e => intake.submitIntake(data, e));
  const row = (await db.query('SELECT * FROM public."CandidateFile" WHERE "applicationId" = $1', [application.id])).rows[0];
  if (clear && row) {
    await files.initiateCandidateFileReview(manager, row.id);
    await files.recordCandidateFileReview(manager, row.id, { observedSha256: digest, outcome: "CLEAN",
      startedAt: new Date().toISOString(), idempotencyKey: randomUUID(), toolVersion: "Synthetic test only" });
  }
  return { application, file: row };
}
async function retention(item, due = true) {
  if (due) await db.query('UPDATE public."Application" SET "expiresAt" = clock_timestamp() - interval \'1 day\' WHERE "id" = $1', [item.application.id]);
  const id = await jobs.enqueueBackgroundJob({ jobType: "APPLICATION_RETENTION_DELETE", applicationId: item.application.id,
    safePayload: { version: 1 }, dedupeKey: `application-retention:${item.application.id}`, availableAt: new Date("2000-01-01") });
  const claimed = await jobs.claimBackgroundJobs(1, 60);
  check(claimed[0]?.id, id);
  return claimed[0];
}
async function queryFailure(sql, values) {
  await rejects(() => db.transaction(async e => { await e.query(sql, values); await e.query("SET CONSTRAINTS ALL IMMEDIATE"); }));
}
async function parkJobs() {
  await db.query(`UPDATE public."BackgroundJob" SET "availableAt" = '2099-01-01' WHERE "state" = 'QUEUED'`);
}
async function releaseAdmission() {
  await db.query(`UPDATE public."IdempotencyRecord" SET "createdAt" = clock_timestamp() - interval '2 seconds',
    "expiresAt" = clock_timestamp() - interval '1 second' WHERE "scope" = 'PHASE_2IB_WORKER'`);
}

try {
  checks += await verifyWorkerGoogleAdapter();
  await seedPhase2CSynthetic();
  await parkJobs();
  // Genuine concurrent connections hold claims open: the second skips the first lock.
  const input = { jobType: "SYNTHETIC_2IB", safePayload: { version: 1 }, dedupeKey: `synthetic:${randomUUID()}`, maxAttempts: 2, availableAt: new Date("2000-01-01") };
  const firstId = await jobs.enqueueBackgroundJob(input);
  check(await jobs.enqueueBackgroundJob(input), firstId);
  for (const mutation of [{ jobType: "DIFFERENT" }, { safePayload: { version: 2 } }, { payloadReference: "different" }, { applicationId: f.applicationId }])
    await rejects(() => jobs.enqueueBackgroundJob({ ...input, ...mutation }));
  const secondId = await jobs.enqueueBackgroundJob({ ...input, dedupeKey: randomUUID() });
  const c1 = new pg.Client({ connectionString: url.href }); const c2 = new pg.Client({ connectionString: url.href });
  await Promise.all([c1.connect(), c2.connect()]);
  let first, second;
  try {
    await Promise.all([c1.query("BEGIN"), c2.query("BEGIN")]);
    [first] = await jobs.claimBackgroundJobs(1, 60, c1);
    [second] = await jobs.claimBackgroundJobs(1, 60, c2);
    check(first.id !== second.id); check(new Set([first.id, second.id]), new Set([firstId, secondId]));
    await Promise.all([c1.query("COMMIT"), c2.query("COMMIT")]);
  } finally { await Promise.all([c1.end(), c2.end()]); }
  check(await jobs.completeBackgroundJob(first.id, randomUUID()), false);
  check(await jobs.completeBackgroundJob(first.id, first.claimToken));
  check(await jobs.completeBackgroundJob(first.id, first.claimToken), false);
  check(await jobs.failBackgroundJob(second.id, randomUUID(), "TRANSIENT"), null);
  check(await jobs.failBackgroundJob(second.id, second.claimToken, "TRANSIENT"), "QUEUED");
  const backoff = (await db.query(`SELECT extract(epoch FROM "availableAt" - clock_timestamp())::int AS seconds,
    "claimToken", "leaseUntil", "errorSummary" FROM public."BackgroundJob" WHERE "id" = $1`, [second.id])).rows[0];
  check(backoff.seconds >= 58 && backoff.seconds <= 60); check(backoff.claimToken, null); check(backoff.leaseUntil, null);
  check(backoff.errorSummary, jobs.JOB_FAILURES.TRANSIENT);
  await db.query('UPDATE public."BackgroundJob" SET "availableAt" = \'2000-01-01\' WHERE "id" = $1', [second.id]);
  const [retry] = await jobs.claimBackgroundJobs(1, 60); check(retry.attemptCount, 2); check(retry.claimToken !== second.claimToken);
  check(await jobs.completeBackgroundJob(retry.id, second.claimToken), false);
  await db.query('UPDATE public."BackgroundJob" SET "leaseUntil" = clock_timestamp() - interval \'1 second\' WHERE "id" = $1', [retry.id]);
  check(await jobs.completeBackgroundJob(retry.id, retry.claimToken), false);
  check(await jobs.failBackgroundJob(retry.id, retry.claimToken, "TRANSIENT"), null);
  const recovered = await jobs.recoverExhaustedJobs(); check(recovered.some(x => x.id === retry.id));
  check((await db.query('SELECT "state" FROM public."BackgroundJob" WHERE "id" = $1', [retry.id])).rows[0].state, "DEAD");
  const reclaimId = await jobs.enqueueBackgroundJob({ ...input, dedupeKey: randomUUID(), maxAttempts: 3 });
  const [oldClaim] = await jobs.claimBackgroundJobs(1, 60);
  await db.query('UPDATE public."BackgroundJob" SET "leaseUntil" = clock_timestamp() - interval \'1 second\' WHERE "id" = $1', [reclaimId]);
  const [freshClaim] = await jobs.claimBackgroundJobs(1, 60); check(freshClaim.claimToken !== oldClaim.claimToken);
  check(await jobs.completeBackgroundJob(reclaimId, oldClaim.claimToken), false);
  check(await jobs.failBackgroundJob(reclaimId, freshClaim.claimToken, "SECURITY"), "DEAD");
  await rejects(() => jobs.failBackgroundJob(reclaimId, freshClaim.claimToken, "raw secret text"));
  // Lease is tested AFTER obtaining a lock, including a blocker that changes no row.
  for (const operation of ["complete", "retry", "ownership"]) {
    const lockedId = await jobs.enqueueBackgroundJob({ ...input, dedupeKey: randomUUID() });
    const [lockedClaim] = await jobs.claimBackgroundJobs(1, 1);
    const locker = new pg.Client({ connectionString: url.href }); await locker.connect();
    await locker.query("BEGIN"); await locker.query('SELECT "id" FROM public."BackgroundJob" WHERE "id"=$1 FOR UPDATE', [lockedId]);
    const waiting = operation === "complete" ? jobs.completeBackgroundJob(lockedId, lockedClaim.claimToken)
      : operation === "retry" ? jobs.failBackgroundJob(lockedId, lockedClaim.claimToken, "TRANSIENT")
      : db.transaction(e => jobs.requireJobOwnership(lockedClaim, e)).then(() => true, () => false);
    await new Promise(resolve => setTimeout(resolve, 1150));
    await locker.query("COMMIT"); await locker.end();
    check(await waiting, operation === "retry" ? null : false);
    await db.query(`UPDATE public."BackgroundJob" SET "attemptCount"="maxAttempts" WHERE "id"=$1`, [lockedId]);
    await jobs.recoverExhaustedJobs();
  }
  const exhaustId = await jobs.enqueueBackgroundJob({ ...input, dedupeKey: randomUUID(), maxAttempts: 1 });
  const [exhaust] = await jobs.claimBackgroundJobs(1,60);
  check(await jobs.failBackgroundJob(exhaustId,exhaust.claimToken,"TRANSIENT"),"DEAD");
  check((await db.query('SELECT "failureClass","errorSummary" FROM public."BackgroundJob" WHERE "id"=$1',[exhaustId])).rows[0],
    {failureClass:"EXHAUSTED",errorSummary:jobs.JOB_FAILURES.EXHAUSTED});
  const capId=await jobs.enqueueBackgroundJob({...input,dedupeKey:randomUUID(),maxAttempts:10});
  await db.query('UPDATE public."BackgroundJob" SET "attemptCount"=6 WHERE "id"=$1',[capId]);
  const [cap]=await jobs.claimBackgroundJobs(1,60); await jobs.failBackgroundJob(cap.id,cap.claimToken,"TRANSIENT");
  const capSeconds=(await db.query('SELECT extract(epoch FROM "availableAt"-clock_timestamp())::int AS seconds FROM public."BackgroundJob" WHERE "id"=$1',[capId])).rows[0].seconds;
  check(capSeconds>=3598&&capSeconds<=3600);
  await parkJobs();
  console.log(`PHASE_2IB_LIFECYCLE_OK checks=${checks}`);

  // Cron authenticates and rejects all command surfaces without database calls.
  const savedSecret = process.env.CRON_SECRET; delete process.env.CRON_SECRET;
  let invoked = 0;
  const triggerRun = async () => { invoked++; return { admitted: false }; };
  const request = (options = {}, suffix = "") => new Request(`https://example.invalid/api/internal/worker${suffix}`, { method: "POST", ...options });
  check((await handleWorkerTrigger(request(), triggerRun)).status, 503);
  process.env.CRON_SECRET = "synthetic-cron-secret-only-0000000000000000";
  for (const authorization of [undefined, "Bearer wrong", "bearer synthetic", "Bearer", "Basic synthetic"]) {
    const response = await handleWorkerTrigger(request({ headers: authorization ? { authorization } : {} }), triggerRun);
    check(response.status, 401); check((await response.text()).includes(process.env.CRON_SECRET), false);
  }
  const headers = { authorization: `Bearer ${process.env.CRON_SECRET}` };
  check((await handleWorkerTrigger(request({ method: "GET", headers }), triggerRun)).status, 405);
  check((await handleWorkerTrigger(request({ headers, body: "{}" }), triggerRun)).status, 400);
  check((await handleWorkerTrigger(request({headers:{...headers,"content-length":"0"},body:""}),triggerRun)).status,200);
  const slowRequest=request({headers,body:new ReadableStream(),duplex:"half"});
  check((await handleWorkerTrigger(slowRequest,triggerRun)).status,400);
  check((await handleWorkerTrigger(request({ headers }, "?handler=delete&jobId=anything"), triggerRun)).status, 400);
  check(invoked, 1);
  const allowed = await handleWorkerTrigger(request({ headers }), triggerRun);
  check(allowed.status, 200); check(allowed.headers.get("cache-control").includes("private, no-store")); check(invoked, 2);
  if (savedSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = savedSecret;

  // Uploader has durable ownership, and a concurrent worker cannot claim its row.
  let heldJob, called = 0;
  storage.onPut = async () => {
    called++;
    check((await jobs.claimBackgroundJobs(1, 60)).length, 0);
    heldJob = (await db.query(`SELECT * FROM public."BackgroundJob" WHERE "state" = 'RUNNING'
      AND "jobType" = 'CANDIDATE_FILE_STORAGE_RECONCILE' ORDER BY "createdAt" DESC LIMIT 1`)).rows[0];
    check(heldJob.claimToken !== null);
  };
  const uploaded = await fixture(); check(called, 1); storage.onPut = null;
  check(await jobs.completeBackgroundJob(heldJob.id, heldJob.claimToken), false);
  // Failed upload remains owned until expiry, then same Drive ID can be reconciled.
  const failedFields = fields(); let failedId;
  storage.onPut = async id => { failedId = id; throw new Error("Synthetic upload interruption"); };
  await rejects(() => files.storeCandidateApplication(failedFields, bytes, digest, bytes.length, storage)); storage.onPut = null;
  await rejects(() => files.storeCandidateApplication(failedFields, bytes, digest, bytes.length, storage));
  const pending = (await db.query('SELECT * FROM public."CandidateFile" WHERE "driveFileId" = $1', [failedId])).rows[0];
  await db.query(`UPDATE public."BackgroundJob" SET "leaseUntil" = clock_timestamp() - interval '1 second'
    WHERE "candidateFileId" = $1`, [pending.id]);
  const [reconcile] = await jobs.claimBackgroundJobs(1, 60);
  await rejects(() => worker.reconcileCandidateFile(reconcile, storage));
  check((await db.query('SELECT "technicalStatus" FROM public."CandidateFile" WHERE "id" = $1', [pending.id])).rows[0].technicalStatus, "UPLOAD_PENDING");
  await storage.put(failedId, pending.storedFilename, bytes, digest);
  storage.objects.get(failedId).digest = "e".repeat(64);
  await rejects(() => worker.reconcileCandidateFile(reconcile, storage));
  storage.objects.get(failedId).digest = digest; storage.objects.get(failedId).unsafe = true;
  await rejects(() => worker.reconcileCandidateFile(reconcile, storage)); storage.objects.get(failedId).unsafe = false;
  await worker.reconcileCandidateFile(reconcile, storage);
  const repaired = (await db.query(`SELECT f."technicalStatus", f."securityStatus", a."technicalStatus" AS application
    FROM public."CandidateFile" f JOIN public."Application" a ON a."id"=f."applicationId" WHERE f."id"=$1`, [pending.id])).rows[0];
  check(repaired, { technicalStatus: "QUARANTINED", securityStatus: "UNREVIEWED", application: "SECURITY_PENDING" });
  check((await db.query('SELECT count(*)::int AS n FROM public."FileSecurityReview" WHERE "candidateFileId"=$1', [pending.id])).rows[0].n, 0);

  // Ordinary live files/submissions cannot use timestamp or status-only exceptions.
  const live = await fixture({ clear: true, portfolio: true });
  // Even a matching retention job + start audit in a subtransaction cannot turn
  // a new required-file submission without clearance into a valid tombstone.
  await rejects(()=>db.transaction(async e=>{
    await e.query('SAVEPOINT synthetic_unsubmitted');
    const forged=await intake.submitIntake(fields(),e,digest);
    await e.query(`UPDATE public."Application" SET "technicalStatus"='SUBMITTED',"hiringStatus"='NEW',"submittedAt"=clock_timestamp(),
      "expiresAt"=clock_timestamp()-interval '1 day' WHERE "id"=$1`,[forged.id]);
    const jobId=await jobs.enqueueBackgroundJob({jobType:"APPLICATION_RETENTION_DELETE",applicationId:forged.id,safePayload:{version:1},
      dedupeKey:`application-retention:${forged.id}`,availableAt:new Date("2000-01-01")},e);
    await jobs.claimBackgroundJobs(1,60,e);
    await e.query(`INSERT INTO public."AuditEvent" ("id","actorType","actionCode","targetType","targetId","outcome","correlationId","safeMetadata")
      VALUES ($1,'SYSTEM','RETENTION_STARTED','APPLICATION',$2,'SUCCEEDED',$3,'{"technicalStatus":"SUBMITTED","hiringStatus":"NEW"}')`,[randomUUID(),forged.id,jobId]);
    await e.query('UPDATE public."Application" SET "deletionRequestedAt"=clock_timestamp() WHERE "id"=$1',[forged.id]);
    await e.query('RELEASE SAVEPOINT synthetic_unsubmitted');
  }));
  await queryFailure('UPDATE public."Application" SET "portfolioUrl"=NULL,"professionalUrl"=NULL WHERE "id"=$1', [live.application.id]);
  await queryFailure('UPDATE public."Application" SET "deletionRequestedAt"=clock_timestamp(),"deletionCompletedAt"=clock_timestamp(),"portfolioUrl"=NULL WHERE "id"=$1', [live.application.id]);
  await queryFailure('UPDATE public."CandidateFile" SET "contentHash"=NULL WHERE "id"=$1', [live.file.id]);
  await queryFailure('UPDATE public."CandidateFile" SET "contentHash"=$2 WHERE "id"=$1', [live.file.id, "e".repeat(64)]);
  await queryFailure(`UPDATE public."CandidateFile" SET "technicalStatus"='DELETED',"deletedAt"=clock_timestamp(),
    "driveFileId"=NULL,"driveZoneCode"=NULL,"contentHash"=NULL WHERE "id"=$1`, [live.file.id]);
  await queryFailure(`UPDATE public."CandidateFile" SET "securityStatus"='UNREVIEWED',"clearanceMethod"=NULL,"clearedAt"=NULL WHERE "id"=$1`, [live.file.id]);
  for(const state of ["UNREVIEWED","REJECTED"]) {
    const ordinary=await fixture();
    if(state==="REJECTED") {
      await files.initiateCandidateFileReview(manager,ordinary.file.id);
      await files.recordCandidateFileReview(manager,ordinary.file.id,{observedSha256:digest,outcome:"REJECTED",startedAt:new Date().toISOString(),idempotencyKey:randomUUID()});
    }
    await queryFailure(`UPDATE public."CandidateFile" SET "technicalStatus"='DELETED',"deletedAt"=clock_timestamp(),"driveFileId"=NULL,"driveZoneCode"=NULL,"contentHash"=NULL WHERE "id"=$1`,[ordinary.file.id]);
    await queryFailure(`UPDATE public."Application" SET "technicalStatus"='SUBMITTED',"hiringStatus"='NEW',"submittedAt"=clock_timestamp() WHERE "id"=$1`,[ordinary.application.id]);
  }
  await queryFailure(`DELETE FROM public."FileSecurityReview" WHERE "candidateFileId"=$1`, [live.file.id]);
  await queryFailure(`UPDATE public."FileSecurityReview" SET "fileHashSnapshot"=$2 WHERE "candidateFileId"=$1`, [live.file.id, "e".repeat(64)]);
  const historyBefore = (await db.query('SELECT * FROM public."FileSecurityReview" WHERE "candidateFileId"=$1', [live.file.id])).rows;
  const statusBefore = (await db.query('SELECT * FROM public."ApplicationStatusEvent" WHERE "applicationId"=$1', [live.application.id])).rows;
  const liveJob = await retention(live);
  await worker.deleteRetainedApplication(liveJob, storage);
  const tombstone = (await db.query(`SELECT a."technicalStatus",a."hiringStatus",a."withdrawnAt",a."fullName",a."portfolioUrl",a."professionalUrl",
    a."experienceLevel",a."source",f."technicalStatus" AS file,f."securityStatus",f."driveFileId",f."contentHash",
    public.completed_retention_evidence(a."id") AS evidence FROM public."Application" a JOIN public."CandidateFile" f ON f."applicationId"=a."id" WHERE a."id"=$1`, [live.application.id])).rows[0];
  check(tombstone, { technicalStatus: "SUBMITTED", hiringStatus: "NEW", withdrawnAt: null, fullName: null,
    portfolioUrl: null, professionalUrl: null, experienceLevel: "", source: "", file: "DELETED", securityStatus: "CLEARED", driveFileId: null, contentHash: null, evidence: true });
  check((await db.query('SELECT * FROM public."FileSecurityReview" WHERE "candidateFileId"=$1', [live.file.id])).rows, historyBefore);
  check((await db.query('SELECT * FROM public."ApplicationStatusEvent" WHERE "applicationId"=$1', [live.application.id])).rows, statusBefore);
  check((await db.query(`SELECT count(*)::int AS n FROM public."CandidateFile" WHERE "id"=$1 AND "securityStatus"='CLEARED' AND "technicalStatus"='QUARANTINED'`, [live.file.id])).rows[0].n, 0);
  await rejects(() => files.retrieveCandidateFile(manager, live.file.id, "candidate_file.cleared.download", storage));
  await rejects(() => files.initiateCandidateFileReview(manager, live.file.id));
  await queryFailure('UPDATE public."CandidateFile" SET "driveFileId"=$2,"contentHash"=$3 WHERE "id"=$1', [live.file.id, "syntheticRecreated", digest]);
  await queryFailure(`UPDATE public."Application" SET "deletionCompletedAt"=NULL WHERE "id"=$1`, [live.application.id]);
  await queryFailure('DELETE FROM public."BackgroundJob" WHERE "id"=$1', [liveJob.id]);
  await queryFailure(`INSERT INTO public."FileSecurityReview" ("id","candidateFileId","method","systemActorCode","toolDescription","fileHashSnapshot",
    "outcome","outcomeCode","idempotencyKey","startedAt","completedAt") VALUES ($1,$2,'MANUAL','SYNTHETIC','Synthetic',$3,'CLEARED','SYNTHETIC',$4,clock_timestamp(),clock_timestamp())`,
    [randomUUID(),live.file.id,digest,randomUUID()]);
  await queryFailure(`UPDATE public."Application" SET "technicalStatus"='WITHDRAWN',"hiringStatus"='WITHDRAWN' WHERE "id"=$1`, [live.application.id]);
  console.log(`PHASE_2IB_TOMBSTONE_OK checks=${checks}`);

  const noFile = await fixture({ file: false, portfolio: true });
  const noFileJob = await retention(noFile); await worker.deleteRetainedApplication(noFileJob, storage);
  check((await db.query('SELECT "portfolioUrl","technicalStatus" FROM public."Application" WHERE "id"=$1', [noFile.application.id])).rows[0], { portfolioUrl: null, technicalStatus: "SUBMITTED" });
  const notDue = await fixture(); const notDueJob = await retention(notDue, false);
  const beforeErases = storage.erases;
  await rejects(() => worker.deleteRetainedApplication(notDueJob, storage)); check(storage.erases, beforeErases);
  await jobs.failBackgroundJob(notDueJob.id, notDueJob.claimToken, "DOMAIN");
  const configuration = await fixture(); const configJob = await retention(configuration);
  process.env.NODE_ENV = "production";
  await rejects(() => worker.deleteRetainedApplication(configJob, storage)); check(storage.erases, beforeErases);
  process.env.NODE_ENV = "test"; await jobs.failBackgroundJob(configJob.id, configJob.claimToken, "CONFIGURATION");

  // A/B: durable responsibility survives pre-call crash or transient deletion failure.
  const partial = await fixture({ clear: true }); const partialJob = await retention(partial);
  storage.onErase = async () => { throw new StorageOperationError("TRANSIENT"); };
  await rejects(() => worker.deleteRetainedApplication(partialJob, storage)); storage.onErase = null;
  check((await db.query('SELECT "deletionRequestedAt" IS NOT NULL AS pending,"deletionCompletedAt" IS NULL AS incomplete FROM public."Application" WHERE "id"=$1', [partial.application.id])).rows[0], { pending: true, incomplete: true });
  check(storage.objects.has(partial.file.driveFileId));
  await rejects(() => files.retrieveCandidateFile(manager, partial.file.id, "candidate_file.cleared.download", storage));
  // C: delete succeeds, final transaction rolls back; same identity then reconciles absence.
  let txCount = 0;
  const failFinal = work => db.transaction(async e => { const value = await work(e); if (++txCount === 2) throw new Error("Synthetic finalization failure"); return value; });
  await rejects(() => worker.deleteRetainedApplication(partialJob, storage, failFinal));
  check(storage.objects.has(partial.file.driveFileId), false);
  check((await db.query('SELECT "driveFileId" FROM public."CandidateFile" WHERE "id"=$1', [partial.file.id])).rows[0].driveFileId, partial.file.driveFileId);
  await worker.deleteRetainedApplication(partialJob, storage);
  await rejects(() => worker.deleteRetainedApplication(partialJob, storage));
  // D: expired lease cannot commit deletion; reclaim uses fresh token and persisted intent.
  const leaseLoss = await fixture(); const leaseJob = await retention(leaseLoss);
  storage.onErase = async () => { await db.query('UPDATE public."BackgroundJob" SET "leaseUntil"=clock_timestamp()-interval \'1 second\' WHERE "id"=$1', [leaseJob.id]); };
  await rejects(() => worker.deleteRetainedApplication(leaseJob, storage)); storage.onErase = null;
  check((await db.query('SELECT "deletionCompletedAt" FROM public."Application" WHERE "id"=$1', [leaseLoss.application.id])).rows[0].deletionCompletedAt, null);
  const [leaseReclaim] = await jobs.claimBackgroundJobs(1, 60); check(leaseReclaim.id, leaseJob.id); check(leaseReclaim.claimToken !== leaseJob.claimToken);
  await worker.deleteRetainedApplication(leaseReclaim, storage);
  // F: initially absent object lacks deletion ownership evidence, and must not tombstone.
  const absent = await fixture(); const absentJob = await retention(absent); const savedObject = storage.objects.get(absent.file.driveFileId);
  storage.objects.delete(absent.file.driveFileId);
  await rejects(() => worker.deleteRetainedApplication(absentJob, storage));
  check((await db.query('SELECT "deletionCompletedAt" FROM public."Application" WHERE "id"=$1', [absent.application.id])).rows[0].deletionCompletedAt, null);
  storage.objects.set(absent.file.driveFileId, savedObject); await worker.deleteRetainedApplication(absentJob, storage);
  // G/H: wrong root/permissions/digest never authorizes delete.
  for (const alteration of [{ unsafe: true }, { digest: "e".repeat(64) }, { name: `${randomUUID()}.pdf` }]) {
    const unsafe = await fixture(); const unsafeJob = await retention(unsafe); const object = storage.objects.get(unsafe.file.driveFileId);
    const saved = { ...object }; Object.assign(object, alteration); const erases = storage.erases;
    await rejects(() => worker.deleteRetainedApplication(unsafeJob, storage)); check(storage.erases, erases);
    storage.objects.set(unsafe.file.driveFileId, saved); await worker.deleteRetainedApplication(unsafeJob, storage);
  }
  console.log(`PHASE_2IB_RECOVERY_OK checks=${checks}`);

  // Fixed dispatch and durable admission: eight poison jobs, max five, overlap admitted once.
  await parkJobs();
  for (let i=0;i<8;i++) await jobs.enqueueBackgroundJob({ jobType: i % 2 ? "EMAIL_NOT_IMPLEMENTED" : "CANDIDATE_FILE_STORAGE_RECONCILE",
    safePayload: { command: "synthetic forbidden command" }, dedupeKey: randomUUID(), availableAt: new Date("2000-01-01") });
  let constructions = 0;
  const factory = () => { constructions++; return storage; };
  await releaseAdmission();
  const outcomes = await Promise.all([worker.runBackgroundWorker({ storage: factory }), worker.runBackgroundWorker({ storage: factory })]);
  check(outcomes.filter(x => x.admitted).length, 1);
  const active = outcomes.find(x => x.admitted); check(active.claimed, 5); check(active.dead, 5); check(constructions, 0);
  check(JSON.stringify(outcomes).includes("claimToken"), false); check(JSON.stringify(outcomes).includes("synthetic.worker@example.invalid"), false);
  check((await worker.runBackgroundWorker({ storage: factory })).admitted, false);
  await releaseAdmission(); const next = await worker.runBackgroundWorker({ storage: factory }); check(next.claimed >= 3 && next.claimed <= 5);
  check(next.dead >= 3);
  // Both legitimate handlers execute through the fixed dispatcher, not just direct calls.
  const workerRetention = await fixture({ clear: true });
  await db.query('UPDATE public."Application" SET "expiresAt"=clock_timestamp()-interval \'1 day\' WHERE "id"=$1', [workerRetention.application.id]);
  await releaseAdmission(); const retentionResult = await worker.runBackgroundWorker({ storage: factory });
  check(retentionResult.deleted, 1); check(retentionResult.succeeded, 1);
  check(retentionResult.oldestDueSeconds, 0);
  let uploadedIdentity;
  storage.onPut = async id => { uploadedIdentity=id; throw new Error("Synthetic delayed completion"); };
  await rejects(() => files.storeCandidateApplication(fields(), bytes, digest, bytes.length, storage)); storage.onPut=null;
  const delayed = (await db.query('SELECT * FROM public."CandidateFile" WHERE "driveFileId"=$1', [uploadedIdentity])).rows[0];
  await storage.put(uploadedIdentity, delayed.storedFilename, bytes, digest);
  await db.query(`UPDATE public."BackgroundJob" SET "leaseUntil"=clock_timestamp()-interval '1 second' WHERE "candidateFileId"=$1`, [delayed.id]);
  await releaseAdmission(); const reconcileResult = await worker.runBackgroundWorker({ storage: factory });
  check(reconcileResult.reconciled, 1); check(reconcileResult.succeeded, 1);

  // A parent lock held by deletion forces a racing answer/review to observe pending state.
  for (const kind of ["answer", "review"]) {
    const target = await fixture(); const job = await retention(target);
    let unlock, announced;
    const gate = new Promise(resolve => { unlock=resolve; });
    const ready = new Promise(resolve => { announced=resolve; });
    let tx=0;
    const holding = work => db.transaction(async e => { const result=await work(e); if (++tx===1) { announced(); await gate; } return result; });
    const deletion = worker.deleteRetainedApplication(job, storage, holding);
    await ready;
    const conn = new pg.Client({ connectionString:url.href }); await conn.connect();
    let finished=false;
    const insertion = (kind === "answer"
      ? conn.query(`INSERT INTO public."ApplicationAnswer" ("id","applicationId","questionTextSnapshot","questionTypeSnapshot","answerText")
          VALUES ($1,$2,'Synthetic','SHORT_TEXT','Synthetic late answer')`, [randomUUID(), target.application.id])
      : conn.query(`INSERT INTO public."FileSecurityReview" ("id","candidateFileId","method","systemActorCode","toolDescription","fileHashSnapshot",
          "outcome","outcomeCode","idempotencyKey","startedAt","completedAt") VALUES ($1,$2,'MANUAL','SYNTHETIC','Synthetic',$3,'FAILED','SYNTHETIC',$4,clock_timestamp(),clock_timestamp())`,
        [randomUUID(), target.file.id, digest, randomUUID()]))
      .then(() => {finished=true; return true;}, () => {finished=true; return false;});
    await new Promise(resolve=>setTimeout(resolve,100)); check(finished,false);
    unlock(); check(await insertion,false); await deletion; await conn.end();
  }
  check(worker.WORKER_BOUNDS.invocationMs, 20_000); check(worker.WORKER_BOUNDS.externalMs, 10_000);
  check(worker.WORKER_BOUNDS.leaseSeconds, 60);
  // Delayed pool/acquire work cannot start database commands after the shared deadline.
  let lateQueries=0;
  const lateRun=async work=>{await new Promise(resolve=>setTimeout(resolve,20_050));return work({query:async()=>{lateQueries++;throw new Error("Should not execute");}});};
  await rejects(()=>worker.runBackgroundWorker({run:lateRun,storage:factory}));check(lateQueries,0);
  console.log(`PHASE_2IB_WORKER_OK checks=${checks} synthetic_disposable=true`);
} finally { await db.closeDatabasePool(); }
