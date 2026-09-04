import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import { config } from "dotenv";

import { phase2BFixtures } from "./seed-phase-2b-synthetic.mjs";
import { phase2CFixtures, seedPhase2CSynthetic } from "./seed-phase-2c-synthetic.mjs";

config({ path: ".env.local", quiet: true });

assert.equal(Number(process.versions.node.split(".")[0]), 22);

const database = await import("../src/lib/server/database.ts");
const csrf = await import("../src/lib/server/auth/csrf.ts");
const session = await import("../src/lib/server/auth/session.ts");
const staffMutations = await import("../src/lib/server/staff-mutations.ts");
const staffReads = await import("../src/lib/server/staff-reads.ts");
const staffRepository = await import("../src/lib/server/repositories/staff.ts");

const failureProjectId = "00000000-0000-4000-8000-000000000030";

function principal(staffUserId, roles, assuranceLevel = "aal2") {
  return {
    authSubjectId: `synthetic-${staffUserId}`,
    staffUserId,
    assuranceLevel,
    roles,
  };
}

const principals = {
  CONTENT_EDITOR: principal(phase2CFixtures.contentEditorStaffId, ["CONTENT_EDITOR"]),
  HIRING_REVIEWER: principal(phase2CFixtures.reviewerStaffId, ["HIRING_REVIEWER"]),
  HIRING_MANAGER: principal(phase2CFixtures.managerStaffId, ["HIRING_MANAGER"]),
  ADMIN: principal(phase2BFixtures.adminStaffId, ["ADMIN"]),
  AUDITOR: principal(phase2CFixtures.auditorStaffId, ["AUDITOR"]),
  ZERO: principal(phase2CFixtures.zeroRoleStaffId, []),
  UNKNOWN: principal(phase2CFixtures.zeroRoleStaffId, ["OWNER"]),
  AAL1: principal(phase2BFixtures.adminStaffId, ["ADMIN"], "aal1"),
};

async function expectUnavailable(work) {
  await assert.rejects(work, (error) => {
    assert([
      "StaffMutationUnavailableError",
      "DatabaseTransactionError",
    ].includes(error.name));
    assert(["Not available.", "Database transaction failed."].includes(error.message));
    return true;
  });
}

async function verifyRolledBack(work) {
  let completed = false;
  await assert.rejects(
    database.transaction(async (executor) => {
      await work(executor);
      completed = true;
      throw new Error("synthetic phase 2f rollback");
    }),
    { name: "DatabaseTransactionError", message: "Database transaction failed." },
  );
  assert.equal(completed, true);
}

function mutationDependencies(actor, executor) {
  return {
    resolvePrincipal: () => Promise.resolve(actor),
    transaction: (work) => work(executor),
  };
}

async function mutate(input, actor, executor) {
  return staffMutations.performStaffMutation(input, mutationDependencies(actor, executor));
}

try {
  await seedPhase2CSynthetic();

  const sameOrigin = new Headers({
    origin: "https://staff.example.invalid",
    host: "staff.example.invalid",
    "x-forwarded-proto": "https",
  });
  assert.equal(csrf.hasSameOriginMutationHeaders(sameOrigin), true);
  assert.equal(csrf.hasSameOriginMutationHeaders(new Headers({ host: "staff.example.invalid" })), false);
  assert.equal(csrf.hasSameOriginMutationHeaders(new Headers({
    origin: "https://attacker.example.invalid",
    host: "staff.example.invalid",
  })), false);
  assert.equal(csrf.hasSameOriginMutationHeaders(new Headers({
    origin: "http://staff.example.invalid",
    host: "staff.example.invalid",
    "x-forwarded-proto": "https",
  })), false);

  for (const actor of [null, principals.AAL1, principals.AUDITOR, principals.ZERO, principals.UNKNOWN]) {
    let transactionCount = 0;
    await expectUnavailable(() => staffMutations.performStaffMutation({
      type: "content.create",
      idempotencyKey: randomUUID(),
      slug: "synthetic-denied-draft",
      title: "Synthetic denied draft",
      summary: "Synthetic verification only.",
    }, {
      resolvePrincipal: () => Promise.resolve(actor),
      transaction: async () => {
        transactionCount += 1;
        throw new Error("Denied mutation reached PostgreSQL.");
      },
    }));
    assert.equal(transactionCount, 0);
  }

  let malformedTransactions = 0;
  await assert.rejects(
    staffMutations.performStaffMutation({
      type: "content.edit",
      idempotencyKey: randomUUID(),
      contentId: "not-a-uuid",
      expectedVersion: 1,
      title: "Synthetic title",
      summary: "Synthetic summary.",
    }, {
      resolvePrincipal: () => Promise.resolve(principals.CONTENT_EDITOR),
      transaction: async () => {
        malformedTransactions += 1;
        throw new Error("Malformed input reached PostgreSQL.");
      },
    }),
    { name: "StaffMutationInputError", message: "Invalid input." },
  );
  assert.equal(malformedTransactions, 0);

  await assert.rejects(
    staffMutations.performStaffMutation({
      type: "content.create",
      idempotencyKey: randomUUID(),
      slug: "Synthetic Invalid Slug",
      title: "Synthetic title",
      summary: "Synthetic summary.",
      roles: ["ADMIN"],
    }, { resolvePrincipal: () => Promise.resolve(principals.CONTENT_EDITOR) }),
    { name: "StaffMutationInputError", message: "Invalid input." },
  );

  await verifyRolledBack(async (executor) => {
    const idempotencyKey = randomUUID();
    const first = await mutate({
      type: "content.create",
      idempotencyKey,
      slug: "synthetic-phase-2f-draft",
      title: "Synthetic Phase 2F Draft",
      summary: "Synthetic draft content for rollback-only mutation verification.",
    }, principals.CONTENT_EDITOR, executor);
    assert.equal(first.outcome, "APPLIED");

    const duplicate = await mutate({
      type: "content.create",
      idempotencyKey,
      slug: "synthetic-phase-2f-draft",
      title: "Synthetic Phase 2F Draft",
      summary: "Synthetic draft content for rollback-only mutation verification.",
    }, principals.CONTENT_EDITOR, executor);
    assert.deepEqual(duplicate, { outcome: "ALREADY_APPLIED", targetId: first.targetId });

    const project = await executor.query(
      `SELECT "publicationState", "version" FROM public."Project" WHERE "id" = $1`,
      [first.targetId],
    );
    assert.deepEqual(project.rows[0], { publicationState: "DRAFT", version: 1 });
    const audit = await executor.query(
      `SELECT "actionCode", "actorStaffUserId", "safeMetadata"
       FROM public."AuditEvent" WHERE "correlationId" = $1`,
      [idempotencyKey],
    );
    assert.equal(audit.rows.length, 1);
    assert.equal(audit.rows[0].actionCode, "CONTENT_DRAFT_CREATED");
    assert.equal(audit.rows[0].actorStaffUserId, principals.CONTENT_EDITOR.staffUserId);
    assert.deepEqual(audit.rows[0].safeMetadata, { publicationState: "DRAFT", version: 1 });
  });

  await verifyRolledBack(async (executor) => {
    await executor.query(
      `UPDATE public."Project"
       SET "publicationState" = 'DRAFT', "version" = 1, "title" = 'Synthetic before edit',
           "summary" = 'Synthetic before edit summary.', "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1`,
      [phase2BFixtures.projectId],
    );
    const idempotencyKey = randomUUID();
    const result = await mutate({
      type: "content.edit",
      idempotencyKey,
      contentId: phase2BFixtures.projectId,
      expectedVersion: 1,
      title: "Synthetic after edit",
      summary: "Synthetic after edit summary.",
    }, principals.CONTENT_EDITOR, executor);
    assert.equal(result.outcome, "APPLIED");
    const project = await executor.query(
      `SELECT "title", "summary", "version" FROM public."Project" WHERE "id" = $1`,
      [phase2BFixtures.projectId],
    );
    assert.deepEqual(project.rows[0], {
      title: "Synthetic after edit",
      summary: "Synthetic after edit summary.",
      version: 2,
    });

    await expectUnavailable(() => mutate({
      type: "content.edit",
      idempotencyKey: randomUUID(),
      contentId: phase2BFixtures.projectId,
      expectedVersion: 1,
      title: "Synthetic stale edit",
      summary: "Synthetic stale edit summary.",
    }, principals.CONTENT_EDITOR, executor));
  });

  await verifyRolledBack(async (executor) => {
    await executor.query(
      `UPDATE public."Application"
       SET "technicalStatus" = 'SUBMITTED', "hiringStatus" = 'NEW',
           "expiresAt" = '2099-01-01T00:00:00Z', "deletionCompletedAt" = NULL,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1`,
      [phase2BFixtures.applicationId],
    );
    const idempotencyKey = randomUUID();
    await mutate({
      type: "application.hiring_status.change",
      idempotencyKey,
      applicationId: phase2BFixtures.applicationId,
      expectedHiringStatus: "NEW",
      requestedHiringStatus: "UNDER_REVIEW",
    }, principals.HIRING_REVIEWER, executor);
    const state = await executor.query(
      `SELECT "hiringStatus" FROM public."Application" WHERE "id" = $1`,
      [phase2BFixtures.applicationId],
    );
    assert.equal(state.rows[0]?.hiringStatus, "UNDER_REVIEW");
    const history = await executor.query(
      `SELECT "fromStatus", "toStatus", "actorStaffUserId"
       FROM public."ApplicationStatusEvent"
       WHERE "applicationId" = $1 AND "reasonCode" = 'STAFF_WORKFLOW_TRANSITION'`,
      [phase2BFixtures.applicationId],
    );
    assert.deepEqual(history.rows.at(-1), {
      fromStatus: "NEW",
      toStatus: "UNDER_REVIEW",
      actorStaffUserId: principals.HIRING_REVIEWER.staffUserId,
    });
    const audit = await executor.query(
      `SELECT "safeMetadata" FROM public."AuditEvent" WHERE "correlationId" = $1`,
      [idempotencyKey],
    );
    assert.deepEqual(audit.rows[0]?.safeMetadata, { fromStatus: "NEW", toStatus: "UNDER_REVIEW" });
    assert(!/email|phone|name|cookie|token|mfa/i.test(JSON.stringify(audit.rows[0])));
  });

  await verifyRolledBack(async (executor) => {
    await executor.query(
      `UPDATE public."Application"
       SET "technicalStatus" = 'SUBMITTED', "hiringStatus" = 'NEW',
           "expiresAt" = '2099-01-01T00:00:00Z', "deletionCompletedAt" = NULL
       WHERE "id" = $1`,
      [phase2BFixtures.applicationId],
    );
    await expectUnavailable(() => mutate({
      type: "application.hiring_status.change",
      idempotencyKey: randomUUID(),
      applicationId: phase2BFixtures.applicationId,
      expectedHiringStatus: "NEW",
      requestedHiringStatus: "WITHDRAWN",
    }, principals.HIRING_REVIEWER, executor));
    await mutate({
      type: "application.hiring_status.change",
      idempotencyKey: randomUUID(),
      applicationId: phase2BFixtures.applicationId,
      expectedHiringStatus: "NEW",
      requestedHiringStatus: "WITHDRAWN",
    }, principals.HIRING_MANAGER, executor);
  });

  await verifyRolledBack(async (executor) => {
    await executor.query(
      `UPDATE public."Application"
       SET "technicalStatus" = 'SUBMITTED', "hiringStatus" = 'NEW',
           "expiresAt" = '2026-09-03T00:00:00Z', "deletionCompletedAt" = NULL
       WHERE "id" = $1`,
      [phase2BFixtures.applicationId],
    );
    await expectUnavailable(() => mutate({
      type: "application.hiring_status.change",
      idempotencyKey: randomUUID(),
      applicationId: phase2BFixtures.applicationId,
      expectedHiringStatus: "NEW",
      requestedHiringStatus: "UNDER_REVIEW",
    }, principals.HIRING_REVIEWER, executor));
    const unchanged = await executor.query(
      `SELECT "hiringStatus" FROM public."Application" WHERE "id" = $1`,
      [phase2BFixtures.applicationId],
    );
    assert.equal(unchanged.rows[0]?.hiringStatus, "NEW");
  });

  await expectUnavailable(() => staffMutations.performStaffMutation({
    type: "application.hiring_status.change",
    idempotencyKey: randomUUID(),
    applicationId: "00000000-0000-4000-8000-000000000099",
    expectedHiringStatus: "NEW",
    requestedHiringStatus: "UNDER_REVIEW",
  }, { resolvePrincipal: () => Promise.resolve(principals.HIRING_REVIEWER) }));

  await verifyRolledBack(async (executor) => {
    await executor.query(
      `UPDATE public."Job"
       SET "lifecycleState" = 'PUBLISHED', "version" = 1, "closedAt" = NULL,
           "archivedAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1`,
      [phase2BFixtures.jobId],
    );
    await mutate({
      type: "job.transition",
      idempotencyKey: randomUUID(),
      jobId: phase2BFixtures.jobId,
      expectedVersion: 1,
      requestedLifecycleState: "CLOSED",
    }, principals.HIRING_MANAGER, executor);
    const job = await executor.query(
      `SELECT "lifecycleState", "version", "closedAt" IS NOT NULL AS "closed"
       FROM public."Job" WHERE "id" = $1`,
      [phase2BFixtures.jobId],
    );
    assert.deepEqual(job.rows[0], { lifecycleState: "CLOSED", version: 2, closed: true });
    await expectUnavailable(() => mutate({
      type: "job.transition",
      idempotencyKey: randomUUID(),
      jobId: phase2BFixtures.jobId,
      expectedVersion: 1,
      requestedLifecycleState: "ARCHIVED",
    }, principals.HIRING_MANAGER, executor));
  });

  for (const [actor, input] of [
    [principals.CONTENT_EDITOR, {
      type: "application.hiring_status.change",
      idempotencyKey: randomUUID(),
      applicationId: phase2BFixtures.applicationId,
      expectedHiringStatus: "NEW",
      requestedHiringStatus: "UNDER_REVIEW",
    }],
    [principals.HIRING_REVIEWER, {
      type: "content.edit",
      idempotencyKey: randomUUID(),
      contentId: phase2BFixtures.projectId,
      expectedVersion: 1,
      title: "Synthetic denied edit",
      summary: "Synthetic denied edit summary.",
    }],
    [principals.AUDITOR, {
      type: "job.transition",
      idempotencyKey: randomUUID(),
      jobId: phase2BFixtures.jobId,
      expectedVersion: 1,
      requestedLifecycleState: "CLOSED",
    }],
  ]) {
    let transactionCount = 0;
    await expectUnavailable(() => staffMutations.performStaffMutation(input, {
      resolvePrincipal: () => Promise.resolve(actor),
      transaction: async () => {
        transactionCount += 1;
        throw new Error("Privilege escalation reached PostgreSQL.");
      },
    }));
    assert.equal(transactionCount, 0);
  }

  await verifyRolledBack(async (executor) => {
    await executor.query(
      `UPDATE public."StaffUser" SET "status" = 'DISABLED', "disabledAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1`,
      [phase2CFixtures.contentEditorStaffId],
    );
    await expectUnavailable(() => staffMutations.performStaffMutation({
      type: "content.create",
      idempotencyKey: randomUUID(),
      slug: "synthetic-disabled-user",
      title: "Synthetic disabled user",
      summary: "Synthetic disabled user verification.",
    }, {
      resolvePrincipal: () => session.resolveAuthenticatedStaff(
        () => Promise.resolve({ subjectId: phase2CFixtures.subjects.contentEditor, assuranceLevel: "aal2" }),
        (subjectId) => staffRepository.findStaffAuthorizationProfile(subjectId, executor),
      ),
      transaction: (work) => work(executor),
    }));
  });

  await verifyRolledBack(async (executor) => {
    await executor.query(
      `UPDATE public."UserRole" SET "revokedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
      [phase2CFixtures.contentEditorRoleId],
    );
    await expectUnavailable(() => staffMutations.performStaffMutation({
      type: "content.create",
      idempotencyKey: randomUUID(),
      slug: "synthetic-revoked-role",
      title: "Synthetic revoked role",
      summary: "Synthetic revoked role verification.",
    }, {
      resolvePrincipal: () => session.resolveAuthenticatedStaff(
        () => Promise.resolve({ subjectId: phase2CFixtures.subjects.contentEditor, assuranceLevel: "aal2" }),
        (subjectId) => staffRepository.findStaffAuthorizationProfile(subjectId, executor),
      ),
      transaction: (work) => work(executor),
    }));
  });

  let claims = { subjectId: phase2CFixtures.subjects.contentEditor, assuranceLevel: "aal2" };
  const freshPrincipal = () => session.resolveAuthenticatedStaff(
    () => Promise.resolve(claims),
    staffRepository.findStaffAuthorizationProfile,
  );
  assert(await freshPrincipal());
  claims = null;
  await expectUnavailable(() => staffMutations.performStaffMutation({
    type: "content.create",
    idempotencyKey: randomUUID(),
    slug: "synthetic-signed-out",
    title: "Synthetic signed out",
    summary: "Synthetic sign-out verification.",
  }, { resolvePrincipal: freshPrincipal }));

  await database.query(`DELETE FROM public."Project" WHERE "id" = $1`, [failureProjectId]);
  await database.query(
    `INSERT INTO public."Project" ("id", "slug", "title", "summary", "publicationState", "version", "updatedAt")
     VALUES ($1, 'synthetic-phase-2f-audit-failure', 'Synthetic audit failure',
       'Synthetic transaction rollback verification.', 'DRAFT', 1, CURRENT_TIMESTAMP)`,
    [failureProjectId],
  );
  const beforeFailure = await database.query(
    `SELECT "title", "version" FROM public."Project" WHERE "id" = $1`,
    [failureProjectId],
  );
  await assert.rejects(
    staffMutations.performStaffMutation({
      type: "content.edit",
      idempotencyKey: randomUUID(),
      contentId: failureProjectId,
      expectedVersion: 1,
      title: "Synthetic change that must roll back",
      summary: "Synthetic transaction rollback verification after mutation.",
    }, {
      resolvePrincipal: () => Promise.resolve(principals.CONTENT_EDITOR),
      transaction: (work) => database.transaction((executor) => work({
        query: (text, values) => {
          if (text.includes('INSERT INTO public."AuditEvent"')) throw new Error("synthetic audit failure");
          return executor.query(text, values);
        },
      })),
    }),
    { name: "DatabaseTransactionError", message: "Database transaction failed." },
  );
  const afterFailure = await database.query(
    `SELECT "title", "version" FROM public."Project" WHERE "id" = $1`,
    [failureProjectId],
  );
  assert.deepEqual(afterFailure.rows[0], beforeFailure.rows[0]);
  const falseAudit = await database.query(
    `SELECT COUNT(*)::integer AS "count" FROM public."AuditEvent"
     WHERE "targetId" = $1 AND "actionCode" = 'CONTENT_DRAFT_EDITED'`,
    [failureProjectId],
  );
  assert.equal(falseAudit.rows[0]?.count, 0);
  await database.query(`DELETE FROM public."Project" WHERE "id" = $1`, [failureProjectId]);

  const transitions = staffMutations.allowedHiringStatusTransitions(
    principals.HIRING_REVIEWER,
    phase2BFixtures.applicationId,
    "NEW",
  );
  assert(transitions.includes("UNDER_REVIEW"));
  assert(!transitions.includes("WITHDRAWN"));
  assert.deepEqual(
    staffMutations.allowedJobTransitions(principals.HIRING_REVIEWER, phase2BFixtures.jobId, "PUBLISHED"),
    [],
  );
  assert.deepEqual(
    staffMutations.allowedJobTransitions(principals.ADMIN, phase2BFixtures.jobId, "PUBLISHED"),
    ["CLOSED"],
  );

  const auditRead = await staffReads.readStaffAuditEvents(principals.AUDITOR);
  assert(auditRead.every((event) => !Object.hasOwn(event, "safeMetadata") && !Object.hasOwn(event, "actorStaffUserId")));

  const security = await database.query(
    `SELECT COUNT(*)::integer AS "failures"
     FROM pg_tables
     WHERE schemaname = 'public'
       AND (rowsecurity = false
         OR has_table_privilege('anon', format('%I.%I', schemaname, tablename), 'SELECT,INSERT,UPDATE,DELETE')
         OR has_table_privilege('authenticated', format('%I.%I', schemaname, tablename), 'SELECT,INSERT,UPDATE,DELETE'))`,
  );
  assert.equal(security.rows[0]?.failures, 0);
  const policies = await database.query(
    `SELECT COUNT(*)::integer AS "count" FROM pg_policies WHERE schemaname = 'public'`,
  );
  assert.equal(policies.rows[0]?.count, 0);

  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(packageJson.dependencies.pg, "8.23.0");
  assert.equal(packageJson.dependencies["@prisma/client"], undefined);
  assert.equal(packageJson.dependencies["@prisma/adapter-pg"], undefined);

  const sourceFiles = [
    "src/lib/server/staff-mutations.ts",
    "src/app/staff/actions.ts",
    "src/lib/server/auth/csrf.ts",
    "src/app/staff/content/page.tsx",
    "src/app/staff/content/[id]/page.tsx",
    "src/app/staff/applications/[id]/page.tsx",
    "src/app/staff/jobs/[id]/page.tsx",
  ];
  const source = (await Promise.all(sourceFiles.map((file) => readFile(file, "utf8")))).join("\n");
  assert(!/SELECT\s+\*/i.test(source));
  assert(!/service_role|SUPABASE_SECRET_KEY|BEGIN PRIVATE KEY|console\.(log|error)/i.test(source));
  assert.match(source, /FOR UPDATE/);
  assert.match(source, /IdempotencyRecord/);
  assert.match(source, /ApplicationStatusEvent/);
  assert.match(source, /hasSameOriginMutationHeaders/);
  assert.match(source, /resolveAuthenticatedStaff/);
  assert.match(source, /submitted\.length !== expected\.length/);

  console.log("PHASE_2F_STAFF_MUTATIONS_OK");
} finally {
  try {
    await database.query(`DELETE FROM public."Project" WHERE "id" = $1`, [failureProjectId]);
  } catch {
    // Best-effort cleanup for the synthetic rollback fixture only.
  }
  await database.closeDatabasePool();
}
