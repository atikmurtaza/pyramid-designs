import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { syntheticEmailAdapter } from "./synthetic-email-adapter.mjs";

const url = new URL(process.env.PHASE2IB_TEST_DATABASE_URL ?? "invalid:");
assert(["localhost", "127.0.0.1"].includes(url.hostname) && /^\/phase2ib_[a-z0-9_]+$/.test(url.pathname));
process.env.DATABASE_URL = url.href;
process.env.NODE_ENV = "test";
process.env.PUBLIC_INTAKE_MODE = "synthetic";
const db = await import("../src/lib/server/database.ts");
const jobs = await import("../src/lib/server/repositories/background-jobs.ts");
const mail = await import("../src/lib/server/candidate-notifications.ts");
const worker = await import("../src/lib/server/background-worker.ts");
const intake = await import("../src/lib/server/public-intake.ts");
const files = await import("../src/lib/server/candidate-files.ts");
const policy = await import("../src/lib/server/candidate-file-policy.ts");
const { phase2BFixtures: f } = await import("./seed-phase-2b-synthetic.mjs");
const { phase2CFixtures: staff, seedPhase2CSynthetic } = await import("./seed-phase-2c-synthetic.mjs");
const { syntheticPdf } = await import("./phase-2h-synthetic-pdf.mjs");
let checks = 0;
const check = (actual, expected = true) => { assert.deepEqual(actual, expected); checks++; };
const rejects = async fn => { await assert.rejects(fn); checks++; };
const manager = { staffUserId: staff.managerStaffId, authSubjectId: staff.subjects.manager, roles: ["HIRING_MANAGER"], assuranceLevel: "aal2" };
function fields(job = false) {
  return new URLSearchParams({ applicationType: job ? "JOB_APPLICATION" : "TALENT_NETWORK",
    ...(job ? { jobId: f.jobId, [`answer.${f.jobQuestionId}`]: f.jobQuestionOptionId }
      : { departmentId: f.departmentId, engagementType: "PERMANENT_INTEREST" }),
    fullName: "Synthetic Notification Candidate", email: "synthetic.notification@example.invalid", city: "Synthetic City",
    experienceLevel: "SYNTHETIC_LEVEL", consentDefinitionId: f.consentDefinitionId, consent: "accepted", idempotencyKey: randomUUID() });
}
const submit = data => db.transaction(e => intake.submitIntake(data ?? fields(), e));
const queryJob = async id => (await db.query('SELECT * FROM public."BackgroundJob" WHERE "id"=$1', [id])).rows[0];
const notificationJobs = async a => (await db.query('SELECT * FROM public."BackgroundJob" WHERE "applicationId"=$1 AND "jobType"=$2', [a.id, mail.NOTIFICATION_JOB])).rows;
async function park() { await db.query(`UPDATE public."BackgroundJob" SET "availableAt"='2099-01-01' WHERE "state"='QUEUED'`); }
async function claim(id, seconds = 60) {
  await park();
  await db.query(`UPDATE public."BackgroundJob" SET "availableAt"='2000-01-01' WHERE "id"=$1`, [id]);
  const [j] = await jobs.claimBackgroundJobs(1, seconds); check(j.id, id); return j;
}
const send = (j, adapter, run = worker.workerTransaction, signal = AbortSignal.timeout(1000)) => mail.sendCandidateConfirmation(j, adapter, signal, run);
async function fixture() { const a = await submit(); const [j] = await notificationJobs(a); return { a, j }; }
async function expire(j) { await db.query(`UPDATE public."BackgroundJob" SET "leaseUntil"=clock_timestamp()-interval '1 second' WHERE "id"=$1`, [j.id]); }
const bytes = syntheticPdf(), digest = policy.sha256(bytes);
const storage = { async allocateId() { return `synthetic${randomUUID().replaceAll("-", "")}`; }, async put() {},
  async get() { return bytes; }, async delete() {}, async verify() { return true; }, async erase() {} };
let envelopes = [];
const logs = [];
const originalInfo = console.info, originalError = console.error;
try {
  await seedPhase2CSynthetic(); await park();
  for (const bad of ["", "a", "a@b", "a@b..com", "a@-b.com", "a@b-.com", "a..b@example.invalid", ".a@example.invalid",
    "a.@example.invalid", "a@example.invalid\r\nBcc:x@example.invalid", "a@example.invalid,b@example.invalid",
    "a@example.invalid;b@example.invalid", "Name <a@example.invalid>", '"a"@example.invalid', " a@example.invalid", "a\t@example.invalid",
    "a@例.invalid", `${"a".repeat(65)}@example.invalid`, `a@${"a".repeat(64)}.invalid`, null]) check(mail.validNotificationRecipient(bad), false);
  for (const good of ["synthetic@example.invalid", "synthetic.plus+test@example.invalid", "synthetic.dot.name@example.invalid"]) check(mail.validNotificationRecipient(good));
  const jobText = mail.renderNotification("JOB_APPLICATION_SUBMITTED", 1), talentText = mail.renderNotification("TALENT_NETWORK_SUBMITTED", 1);
  check(jobText.text !== talentText.text); check(jobText.subject !== talentText.subject);
  for (const template of [jobText, talentText]) {
    check(typeof template.text, "string"); check(!/[<>\r\n]/.test(template.subject));
    check(!/https?:|drive|quarantin|malware|security|claim|CV|Synthetic Notification|@|<script|[0-9a-f]{8}-/i.test(JSON.stringify(template)));
  }
  for (const [event, version] of [["toString", 1], ["ARBITRARY", 1], ["JOB_APPLICATION_SUBMITTED", 2]]) {
    assert.throws(() => mail.renderNotification(event, version)); checks++;
  }
  // Same submission across concurrent transactions commits once and retains one outbox row.
  for (const isJob of [true, false]) {
    const data = fields(isJob), [a, b] = await Promise.all([submit(data), submit(data)]);
    check(a.id, b.id); check(a.technicalStatus, "SUBMITTED");
    const list = await notificationJobs(a); check(list.length, 1);
    check(list[0].safePayload.event, isJob ? "JOB_APPLICATION_SUBMITTED" : "TALENT_NETWORK_SUBMITTED");
    const identity = mail.notificationIdentity(a.id, list[0].safePayload.event);
    check(identity, list[0].safePayload.identity);
    check(await db.transaction(e => mail.enqueueCandidateConfirmation(a.id, e)), list[0].id);
    check((await notificationJobs(a)).length, 1);
    // A version change cannot create a second semantic notification under the stable key.
    await rejects(() => jobs.enqueueBackgroundJob({ jobType: mail.NOTIFICATION_JOB, applicationId: a.id,
      dedupeKey: list[0].dedupeKey, safePayload: { ...list[0].safePayload, templateVersion: 2 } }));
    process.env.NODE_ENV = "production"; check(mail.notificationIdentity(a.id, list[0].safePayload.event) !== identity); process.env.NODE_ENV = "test";
  }
  // Failure before submission and failure at enqueue both leave no application/idempotency/outbox.
  for (const atEnqueue of [false, true]) {
    const before = (await db.query('SELECT count(*)::int AS n FROM public."Application"')).rows[0].n;
    const jobsBefore = (await db.query('SELECT count(*)::int AS n FROM public."BackgroundJob"')).rows[0].n;
    await rejects(() => db.transaction(e => intake.submitIntake(fields(), { query: async (sql, values) => {
      if (sql.includes(atEnqueue ? 'INSERT INTO public."BackgroundJob"' : 'INSERT INTO public."CandidateConsent"')) throw new Error("Synthetic transaction fault.");
      return e.query(sql, values);
    } })));
    check((await db.query('SELECT count(*)::int AS n FROM public."Application"')).rows[0].n, before);
    check((await db.query('SELECT count(*)::int AS n FROM public."BackgroundJob"')).rows[0].n, jobsBefore);
  }
  // File completion cannot notify before clearance; enqueue rollback also rolls back clearance/review.
  const aFile = await files.storeCandidateApplication(fields(), bytes, digest, bytes.length, storage);
  const file = (await db.query('SELECT "id" FROM public."CandidateFile" WHERE "applicationId"=$1', [aFile.id])).rows[0];
  check((await notificationJobs(aFile)).length, 0);
  check((await db.query('SELECT "technicalStatus" FROM public."Application" WHERE "id"=$1', [aFile.id])).rows[0].technicalStatus, "SECURITY_PENDING");
  await files.initiateCandidateFileReview(manager, file.id);
  const review = { observedSha256: digest, outcome: "CLEAN", startedAt: new Date().toISOString(), idempotencyKey: randomUUID(), toolVersion: "Synthetic test only" };
  await rejects(() => files.recordCandidateFileReview(manager, file.id, review, work => db.transaction(e => work({ query: async (sql, values) => {
    if (sql.includes('INSERT INTO public."BackgroundJob"')) throw new Error("Synthetic enqueue fault.");
    return e.query(sql, values);
  } }))));
  check((await notificationJobs(aFile)).length, 0);
  check((await db.query('SELECT "technicalStatus" FROM public."Application" WHERE "id"=$1', [aFile.id])).rows[0].technicalStatus, "SECURITY_PENDING");
  await Promise.all([files.recordCandidateFileReview(manager, file.id, review), files.recordCandidateFileReview(manager, file.id, review)]);
  check((await notificationJobs(aFile)).length, 1);
  // Poisoned payload/identity/FK never supplies a recipient or chooses a template.
  const base = await fixture(), baseClaim = await claim(base.j.id);
  for (const mutation of [{ safePayload: { ...baseClaim.safePayload, recipient: "override@example.invalid" } },
    { safePayload: { ...baseClaim.safePayload, event: "toString" } }, { safePayload: { ...baseClaim.safePayload, templateVersion: 2 } },
    { applicationId: randomUUID() }, { candidateFileId: randomUUID() }, { payloadReference: "https://example.invalid" }]) {
    assert.throws(() => worker.validateWorkerJob({ ...baseClaim, ...mutation })); checks++;
  }
  // Even a self-consistent replacement application identity fails the immutable scheduling seal.
  const other = await fixture();
  const forged = { ...baseClaim, applicationId: other.a.id, safePayload: { ...baseClaim.safePayload,
    identity: mail.notificationIdentity(other.a.id, baseClaim.safePayload.event) } };
  const never = syntheticEmailAdapter(); check(await send(forged, never), "DEAD"); check(never.calls, 0);
  for (const [outcome, state, failure] of [["ACCEPTED", "SUCCEEDED", null], ["DEFINITE_REJECTION", "DEAD", "EMAIL_RECIPIENT"],
    ["RETRYABLE_FAILURE", "QUEUED", "TRANSIENT"], ["RATE_LIMIT", "QUEUED", "TRANSIENT"], ["AUTH_FAILURE", "DEAD", "EMAIL_AUTH"],
    ["CONFIG_FAILURE", "DEAD", "CONFIGURATION"], ["AMBIGUOUS_ACCEPTANCE", "DEAD", "EMAIL_AMBIGUOUS"],
    ["TIMEOUT", "DEAD", "EMAIL_AMBIGUOUS"], ["CRASH_AFTER_ACCEPTANCE", "DEAD", "EMAIL_AMBIGUOUS"]]) {
    const { a, j } = await fixture(), claimed = await claim(j.id);
    const adapter = syntheticEmailAdapter([outcome, "ACCEPTED"], envelope => { envelopes.push(envelope); });
    // Keep the event loop alive during native AbortSignal's unref'ed timeout.
    const keepalive = setInterval(() => {}, 100);
    try { check(await send(claimed, adapter, worker.workerTransaction, AbortSignal.timeout(40)), state); }
    finally { clearInterval(keepalive); }
    check((await queryJob(j.id)).failureClass, failure); check(adapter.calls, 1);
    check((await db.query('SELECT "technicalStatus" FROM public."Application" WHERE "id"=$1', [a.id])).rows[0].technicalStatus, "SUBMITTED");
    if (state === "QUEUED") {
      const retry = await claim(j.id); check(await send(retry, adapter), "SUCCEEDED"); check(adapter.calls, 2);
      check(envelopes.at(-1).identity, envelopes.at(-2).identity);
    }
  }
  // Wrong token and expired/reclaimed workers cannot send. Crash before durable intent is retryable.
  const crash = await fixture(), old = await claim(crash.j.id), crashAdapter = syntheticEmailAdapter();
  await rejects(() => send({ ...old, claimToken: randomUUID() }, crashAdapter)); check(crashAdapter.calls, 0);
  await expire(old); await rejects(() => send(old, crashAdapter)); check(crashAdapter.calls, 0);
  const reclaimed = await claim(old.id); await rejects(() => send(old, crashAdapter));
  check(await send(reclaimed, crashAdapter), "SUCCEEDED"); check(crashAdapter.calls, 1);
  // Crash after committing intent but before invoking provider: conservative manual outcome, no resend.
  const beforeCall = await fixture(), beforeClaim = await claim(beforeCall.j.id), beforeAdapter = syntheticEmailAdapter();
  let committed = false;
  await rejects(() => send(beforeClaim, beforeAdapter, async work => {
    const result = await worker.workerTransaction(work);
    if (!committed) { committed = true; throw new Error("Synthetic crash after commit."); }
    return result;
  }));
  check(beforeAdapter.calls, 0); await expire(beforeClaim);
  check(await send(await claim(beforeClaim.id), beforeAdapter), "DEAD"); check(beforeAdapter.calls, 0);
  // Provider accepted -> actual acknowledgement transaction rollback -> lease reclaim -> no second call.
  const ack = await fixture(), ackClaim = await claim(ack.j.id), ackAdapter = syntheticEmailAdapter();
  await rejects(() => send(ackClaim, ackAdapter, work => db.transaction(e => work({ query: async (sql, values) => {
    if (sql.includes("SET \"state\" = 'SUCCEEDED'")) throw new Error("Synthetic acknowledgement fault.");
    return e.query(sql, values);
  } }))));
  check(ackAdapter.calls, 1); check((await queryJob(ack.j.id)).state, "RUNNING"); await expire(ackClaim);
  check(await send(await claim(ack.j.id), ackAdapter), "DEAD"); check(ackAdapter.calls, 1);
  check((await queryJob(ack.j.id)).failureClass, "EMAIL_AMBIGUOUS");
  // Authoritative malformed contact is terminal; erased/due/withdrawn contact is suppressed.
  for (const value of ["bad@@example.invalid", "a@example.invalid,b@example.invalid", "a@example.invalid\r\nBcc:b@example.invalid"]) {
    const x = await fixture(); await db.query('UPDATE public."Application" SET "email"=$2 WHERE "id"=$1', [x.a.id, value]);
    const adapter = syntheticEmailAdapter(); check(await send(await claim(x.j.id), adapter), "DEAD"); check(adapter.calls, 0);
    check((await queryJob(x.j.id)).failureClass, "EMAIL_RECIPIENT");
  }
  // Tombstone using the real retention handler; never recover contact from immutable evidence.
  const erased = await fixture();
  await db.query(`UPDATE public."Application" SET "expiresAt"=clock_timestamp()-interval '1 day' WHERE "id"=$1`, [erased.a.id]);
  const retentionId = await jobs.enqueueBackgroundJob({ jobType: "APPLICATION_RETENTION_DELETE", applicationId: erased.a.id,
    safePayload: { version: 1 }, dedupeKey: `application-retention:${erased.a.id}` });
  await worker.deleteRetainedApplication(await claim(retentionId), storage);
  check((await db.query('SELECT "email" FROM public."Application" WHERE "id"=$1', [erased.a.id])).rows[0].email, null);
  const erasedAdapter = syntheticEmailAdapter(); check(await send(await claim(erased.j.id), erasedAdapter), "DEAD");
  check(erasedAdapter.calls, 0); check((await queryJob(erased.j.id)).failureClass, "EMAIL_SUPPRESSED");
  // Send admitted first: a concurrent retention transaction must defer responsibility/erasure.
  const race = await fixture(), raceClaim = await claim(race.j.id);
  let entered, resume;
  const enteredPromise = new Promise(resolve => { entered = resolve; });
  const resumePromise = new Promise(resolve => { resume = resolve; });
  const raceAdapter = syntheticEmailAdapter(["ACCEPTED"], async () => { entered(); await resumePromise; });
  const sending = send(raceClaim, raceAdapter);
  await enteredPromise;
  await db.query(`UPDATE public."Application" SET "expiresAt"=clock_timestamp()-interval '1 day' WHERE "id"=$1`, [race.a.id]);
  const raceRetentionId = await jobs.enqueueBackgroundJob({ jobType: "APPLICATION_RETENTION_DELETE", applicationId: race.a.id,
    safePayload: { version: 1 }, dedupeKey: `application-retention:${race.a.id}` });
  const raceRetention = await claim(raceRetentionId);
  await rejects(() => worker.deleteRetainedApplication(raceRetention, storage));
  check((await db.query('SELECT "deletionRequestedAt" FROM public."Application" WHERE "id"=$1', [race.a.id])).rows[0].deletionRequestedAt, null);
  resume(); check(await sending, "SUCCEEDED"); await worker.deleteRetainedApplication(raceRetention, storage);
  check((await db.query('SELECT "email" FROM public."Application" WHERE "id"=$1', [race.a.id])).rows[0].email, null);
  // Deadline bounds waiting, not the effect: retention must also respect unresolved intent.
  const late = await fixture(), lateClaim = await claim(late.j.id);
  const lateAbort = new AbortController();
  let lateEntered, lateResume;
  const lateEnteredPromise = new Promise(resolve => { lateEntered = resolve; });
  const lateResumePromise = new Promise(resolve => { lateResume = resolve; });
  const lateAdapter = syntheticEmailAdapter(["ACCEPTED"], async () => { lateEntered(); await lateResumePromise; });
  const lateSending = send(lateClaim, lateAdapter, worker.workerTransaction, lateAbort.signal);
  await lateEnteredPromise; lateAbort.abort(); check(await lateSending, "DEAD");
  await db.query(`UPDATE public."Application" SET "expiresAt"=clock_timestamp()-interval '1 day' WHERE "id"=$1`, [late.a.id]);
  const lateRetentionId = await jobs.enqueueBackgroundJob({ jobType: "APPLICATION_RETENTION_DELETE", applicationId: late.a.id,
    safePayload: { version: 1 }, dedupeKey: `application-retention:${late.a.id}` });
  const claimedLateRetention = await claim(lateRetentionId);
  await rejects(() => worker.deleteRetainedApplication(claimedLateRetention, storage));
  lateResume(); await new Promise(resolve => setImmediate(resolve)); check(lateAdapter.calls, 0);
  check((await db.query('SELECT "deletionRequestedAt" FROM public."Application" WHERE "id"=$1', [late.a.id])).rows[0].deletionRequestedAt, null);
  // Retention admission first (due) suppresses sending without ever resolving historical contact.
  const due = await fixture(); await db.query(`UPDATE public."Application" SET "expiresAt"=clock_timestamp()-interval '1 day' WHERE "id"=$1`, [due.a.id]);
  const dueAdapter = syntheticEmailAdapter(); check(await send(await claim(due.j.id), dueAdapter), "DEAD"); check(dueAdapter.calls, 0);
  // Production/default adapter unavailable, even if test injection is attempted.
  for (const production of [false, true]) {
    const x = await fixture(), c = await claim(x.j.id), adapter = production ? syntheticEmailAdapter() : mail.unavailableEmailAdapter;
    if (production) {
      process.env.NODE_ENV = "production";
      assert.throws(() => syntheticEmailAdapter()); checks++;
      // Environment drift invalidates a queued test identity before any provider invocation.
      await rejects(() => send(c, adapter)); check(adapter.calls, 0);
      process.env.NODE_ENV = "test";
    } else { check(await send(c, adapter), "DEAD"); check((await queryJob(c.id)).failureClass, "CONFIGURATION"); }
  }
  check(mail.emailReadiness(), "UNAVAILABLE_UNTIL_PHASE_2IC2");
  // A genuinely production-scoped job cannot select the injected synthetic adapter either.
  const productionFields = fields();
  process.env.NODE_ENV = "production";
  const applications = await import("../src/lib/server/repositories/applications.ts");
  const productionApplication = await db.transaction(e => applications.createFileFreeApplication({
    applicationType: "TALENT_NETWORK", departmentId: f.departmentId, engagementType: "PERMANENT_INTEREST",
    fullName: "Synthetic Notification Candidate", email: "synthetic.notification@example.invalid", city: "Synthetic City",
    experienceLevel: "SYNTHETIC_LEVEL", source: "SYNTHETIC_TEST", consentDefinitionId: f.consentDefinitionId,
    retentionPolicyId: f.retentionPolicyId, requestId: randomUUID(), idempotencyKeyHash: policy.sha256(Buffer.from(productionFields.toString())),
    requestHash: policy.sha256(Buffer.from("synthetic-production-notification")), idempotencyExpiresAt: new Date(Date.now() + 60000),
  }, e));
  const [productionJob] = await notificationJobs(productionApplication);
  const productionClaim = await claim(productionJob.id);
  const noProductionCall = { mode: "synthetic", async send() { throw new Error("Production adapter must not be invoked."); } };
  check(await send(productionClaim, noProductionCall), "DEAD");
  check((await queryJob(productionJob.id)).failureClass, "CONFIGURATION");
  process.env.NODE_ENV = "test";
  const withdrawn = await fixture();
  await applications.changeHiringStatus({ applicationId: withdrawn.a.id, actorStaffUserId: staff.managerStaffId,
    toStatus: "WITHDRAWN", reasonCode: "SYNTHETIC_WITHDRAWAL", correlationId: randomUUID() });
  const withdrawnAdapter = syntheticEmailAdapter(); check(await send(await claim(withdrawn.j.id), withdrawnAdapter), "DEAD");
  check(withdrawnAdapter.calls, 0); check((await queryJob(withdrawn.j.id)).failureClass, "EMAIL_SUPPRESSED");
  // Actual fixed dispatcher and concurrent scheduler admission, without any Google configuration.
  await park(); const dispatched = await fixture();
  await db.query(`UPDATE public."IdempotencyRecord" SET "createdAt"=clock_timestamp()-interval '2 seconds',
    "expiresAt"=clock_timestamp()-interval '1 second' WHERE "scope"='PHASE_2IB_WORKER'`);
  console.info = (...args) => logs.push(args.join(" ")); console.error = (...args) => logs.push(args.join(" "));
  const dispatchAdapter = syntheticEmailAdapter();
  const results = await Promise.all([worker.runBackgroundWorker({ email: dispatchAdapter }), worker.runBackgroundWorker({ email: dispatchAdapter })]);
  check(results.filter(r => r.admitted).length, 1); check(dispatchAdapter.calls, 1);
  check((await queryJob(dispatched.j.id)).state, "SUCCEEDED");
  check(results.find(r => r.admitted).emailReadiness, "UNAVAILABLE_UNTIL_PHASE_2IC2");
  console.info = originalInfo; console.error = originalError;
  // Inspect only safe persistence; never print envelopes or database content on success.
  const payloads = (await db.query('SELECT "safePayload", "dedupeKey", "errorSummary" FROM public."BackgroundJob" WHERE "jobType"=$1', [mail.NOTIFICATION_JOB])).rows;
  const audits = (await db.query(`SELECT "safeMetadata", "reasonCode" FROM public."AuditEvent" WHERE "actionCode" LIKE 'NOTIFICATION_%'`)).rows;
  const evidence = JSON.stringify({ payloads, audits, logs });
  for (const forbidden of ["@example.invalid", "Synthetic Notification Candidate", jobText.text, talentText.text, "Bcc:", "claimToken", "syntheticDrive"]) check(!evidence.includes(forbidden));
  for (const envelope of envelopes) {
    check(Object.keys(envelope).sort(), ["event", "identity", "recipient", "subject", "templateVersion", "text"]);
    check(envelope.recipient, "synthetic.notification@example.invalid");
  }
  envelopes = [];
  console.log(`PHASE_2IC1_NOTIFICATIONS_OK checks=${checks}`);
} finally {
  console.info = originalInfo; console.error = originalError;
  await db.closeDatabasePool();
}
