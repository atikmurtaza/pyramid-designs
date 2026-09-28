import assert from "node:assert/strict";
import { readFile, open, writeFile, mkdir } from "node:fs/promises";
import { parse } from "dotenv";
import { notificationFixtureDatabase } from "./phase-2ic2b-fixture.mjs";

// Local CLI only. No route, public input, arbitrary recipient/body/key or resume
// after process loss. The marker survives an ambiguous request and forbids reruns.
const marker = new URL("../tmp/phase2ic2b-live.json", import.meta.url);
let context, evidence, markerCreated = false;
try {
  const local = parse(await readFile(new URL("../.env.local", import.meta.url), "utf8"));
  const names = ["EMAIL_PROVIDER", "RESEND_API_KEY", "EMAIL_FROM_ADDRESS", "EMAIL_FROM_NAME",
    "EMAIL_REPLY_TO_MODE", "EMAIL_REPLY_TO_ADDRESS", "PHASE2IC2B_LIVE_RECIPIENT"];
  for (const name of names) {
    assert(typeof local[name] === "string" && local[name].length > 0, "Private local configuration required.");
    process.env[name] = local[name];
  }
  assert(local.PHASE2IC2B_LIVE_RECIPIENT === "contact@pyramiddesigns.co", "Approved recipient required.");
  process.env.NODE_ENV = "test";
  const { configuredEmailAdapter, emailReadiness } = await import("../src/lib/server/resend-email.ts");
  assert(emailReadiness() === "EMAIL_PROVIDER_CONFIGURED", "Private local configuration invalid.");
  context = await notificationFixtureDatabase();
  const { db, mail, worker, fixture, claim, send, expire, row, acknowledgementFault } = context;
  // Require a dedicated, empty notification corpus: never send an existing queue.
  assert((await db.query('SELECT count(*)::int AS n FROM public."BackgroundJob" WHERE "jobType"=$1', [mail.NOTIFICATION_JOB])).rows[0].n === 0,
    "Live rehearsal requires a fresh dedicated disposable database.");
  await mkdir(new URL("../tmp/", import.meta.url), { recursive: true });
  const lock = await open(marker, "wx");
  await lock.writeFile(JSON.stringify({ status: "RESERVED_DO_NOT_REPEAT", startedAt: new Date().toISOString() }));
  await lock.close(); markerCreated = true;
  const x = await fixture("contact@pyramiddesigns.co"), j = await claim(x.j.id);
  const provider = configuredEmailAdapter();
  const receipts = []; let requests = 0, identity, bodyFingerprint;
  const adapter = { ...provider, async send(envelope, signal) {
    assert(envelope.recipient === "contact@pyramiddesigns.co", "Live boundary rejected.");
    assert(envelope.event === "TALENT_NETWORK_SUBMITTED" && envelope.templateVersion === 1, "Live template rejected.");
    const fingerprint = provider.requestFingerprint(envelope);
    if (identity) assert(identity === envelope.identity && bodyFingerprint === fingerprint, "Live drift rejected.");
    else { identity = envelope.identity; bodyFingerprint = fingerprint; }
    assert(requests < 2, "Live request budget exhausted."); requests++;
    const result = await provider.send(envelope, signal);
    assert(typeof result === "object" && result.outcome === "ACCEPTED" && result.receipt, "Provider acceptance unverified; do not repeat.");
    if (receipts.length) assert(result.receipt === receipts[0], "Unexpected provider receipt; stop.");
    receipts.push(result.receipt);
    return result;
  } };
  let permit;
  await assert.rejects(() => send(j, adapter, acknowledgementFault, value => { permit = value; }));
  assert(permit && receipts.length === 1, "Provider acceptance unverified; do not repeat.");
  evidence = { status: "ACCEPTED_ACKNOWLEDGEMENT_UNRESOLVED", startedAt: new Date().toISOString(),
    jobId: j.id, receipt: receipts[0], logicalEmailsAccepted: 1, idempotentReplays: 0 };
  await writeFile(marker, JSON.stringify(evidence, null, 2));
  assert((await row(j.id)).state === "RUNNING", "Acknowledgement rollback missing.");
  await expire(j);
  assert(await send(await claim(j.id), adapter) === "DEAD" && requests === 1, "Blind retry detected.");
  assert(await mail.reconcileCandidateConfirmation(permit, AbortSignal.timeout(10_000), worker.workerTransaction) === "SUCCEEDED", "Reconciliation unverified.");
  assert(receipts.length === 2 && receipts[0] === receipts[1] && requests === 2, "Idempotency unverified.");
  const audits = (await db.query(`SELECT "safeMetadata" FROM public."AuditEvent"
    WHERE "targetId"=$1 AND "actionCode"='NOTIFICATION_PROVIDER_ACCEPTED'`, [j.id])).rows;
  assert(audits.length === 1 && audits[0].safeMetadata.receipt === receipts[0], "Acceptance audit missing.");
  const safe = JSON.stringify((await db.query(`SELECT "safeMetadata", "reasonCode" FROM public."AuditEvent"
    WHERE "targetId"=$1`, [j.id])).rows);
  assert(!safe.includes(local.RESEND_API_KEY) && !safe.includes("@") && !safe.includes("Synthetic C2B Candidate"), "Evidence boundary failed.");
  evidence = { ...evidence, status: "PROVIDER_ACCEPTANCE_VERIFIED", completedAt: new Date().toISOString(),
    idempotentReplays: 1, acknowledgementRollback: true, normalWorkerResent: false, inboxDeliveryVerified: false };
  await writeFile(marker, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
} catch {
  // Never emit assertion operands, raw errors, response bodies or private config.
  if (markerCreated) console.error("LIVE_REHEARSAL_STOPPED: inspect safe local marker; do not rerun or mint another identity.");
  else console.error("LIVE_REHEARSAL_NOT_STARTED: local configuration, fresh disposable database and unused marker required.");
  process.exitCode = 1;
} finally { if (context) await context.db.closeDatabasePool(); }
