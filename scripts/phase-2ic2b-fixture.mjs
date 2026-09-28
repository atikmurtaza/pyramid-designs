import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function notificationFixtureDatabase() {
  const url = new URL(process.env.PHASE2IB_TEST_DATABASE_URL ?? "invalid:");
  assert(["localhost", "127.0.0.1"].includes(url.hostname) && /^\/phase2ib_[a-z0-9_]+$/.test(url.pathname), "Disposable database required.");
  process.env.DATABASE_URL = url.href;
  process.env.NODE_ENV = "test";
  process.env.PUBLIC_INTAKE_MODE = "synthetic";
  const db = await import("../src/lib/server/database.ts");
  const jobs = await import("../src/lib/server/repositories/background-jobs.ts");
  const mail = await import("../src/lib/server/candidate-notifications.ts");
  const worker = await import("../src/lib/server/background-worker.ts");
  const { phase2BFixtures: f } = await import("./seed-phase-2b-synthetic.mjs");
  const { seedPhase2CSynthetic } = await import("./seed-phase-2c-synthetic.mjs");
  const intake = await import("../src/lib/server/public-intake.ts");
  await seedPhase2CSynthetic();
  const park = () => db.query(`UPDATE public."BackgroundJob" SET "availableAt"='2099-01-01' WHERE "state"='QUEUED'`);
  async function fixture(recipient = "synthetic.c2b@example.invalid") {
    const fields = new URLSearchParams({ applicationType: "TALENT_NETWORK", departmentId: f.departmentId,
      engagementType: "PERMANENT_INTEREST", fullName: "Synthetic C2B Candidate", email: "synthetic.c2b@example.invalid",
      city: "Synthetic City", experienceLevel: "SYNTHETIC_LEVEL", consentDefinitionId: f.consentDefinitionId,
      consent: "accepted", idempotencyKey: randomUUID() });
    const a = await db.transaction(e => intake.submitIntake(fields, e));
    // Only a disposable synthetic fixture may use the single owner-approved sink.
    assert(["synthetic.c2b@example.invalid", "contact@pyramiddesigns.co"].includes(recipient));
    if (recipient !== "synthetic.c2b@example.invalid") await db.query('UPDATE public."Application" SET "email"=$2 WHERE "id"=$1', [a.id, recipient]);
    const j = (await db.query('SELECT "id" FROM public."BackgroundJob" WHERE "applicationId"=$1 AND "jobType"=$2', [a.id, mail.NOTIFICATION_JOB])).rows[0];
    return { a, j };
  }
  async function claim(id) {
    await park();
    await db.query(`UPDATE public."BackgroundJob" SET "availableAt"='2000-01-01' WHERE "id"=$1`, [id]);
    const [j] = await jobs.claimBackgroundJobs(1, 60);
    assert.equal(j?.id, id); return j;
  }
  const expire = j => db.query(`UPDATE public."BackgroundJob" SET "leaseUntil"=clock_timestamp()-interval '1 second' WHERE "id"=$1`, [j.id]);
  const row = async id => (await db.query('SELECT * FROM public."BackgroundJob" WHERE "id"=$1', [id])).rows[0];
  const send = (j, adapter, run = worker.workerTransaction, onFailure) => mail.sendCandidateConfirmation(j, adapter, AbortSignal.timeout(10_000), run, onFailure);
  const acknowledgementFault = work => db.transaction(e => work({ query: (sql, values) => {
    if (sql.includes("SET \"state\" = 'SUCCEEDED'")) throw new Error("Synthetic acknowledgement rollback.");
    return e.query(sql, values);
  } }));
  return { db, jobs, mail, worker, fixture, claim, expire, row, send, acknowledgementFault };
}
