import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { config } from "dotenv";

import { phase2BFixtures } from "./seed-phase-2b-synthetic.mjs";
import { phase2CFixtures, seedPhase2CSynthetic } from "./seed-phase-2c-synthetic.mjs";

config({ path: ".env.local", quiet: true });

assert.equal(
  Number(process.versions.node.split(".")[0]),
  22,
  "Phase 2D staff-read verification must run under Node.js 22.",
);

const database = await import("../src/lib/server/database.ts");
const authorization = await import("../src/lib/server/auth/authorization.ts");
const session = await import("../src/lib/server/auth/session.ts");
const staffRepository = await import("../src/lib/server/repositories/staff.ts");
const staffReads = await import("../src/lib/server/staff-reads.ts");

const nonexistentId = "00000000-0000-4000-8000-000000000099";

function principal(roles, assuranceLevel = "aal2") {
  return {
    authSubjectId: "synthetic-phase-2d-subject",
    staffUserId: phase2CFixtures.contentEditorStaffId,
    assuranceLevel,
    roles,
  };
}

async function expectUnavailable(work, expectedName = "StaffReadUnavailableError") {
  await assert.rejects(work, (error) => {
    assert.equal(error.name, expectedName);
    assert.equal(error.message, "Not available.");
    return true;
  });
}

async function verifyRolledBack(work) {
  let verified = false;
  await assert.rejects(
    database.transaction(async (executor) => {
      await work(executor);
      verified = true;
      throw new Error("synthetic phase 2d rollback");
    }),
    { name: "DatabaseTransactionError", message: "Database transaction failed." },
  );
  assert.equal(verified, true, "A controlled lifecycle check failed before rollback.");
}

try {
  await seedPhase2CSynthetic();

  const principals = {
    CONTENT_EDITOR: principal(["CONTENT_EDITOR"]),
    HIRING_REVIEWER: principal(["HIRING_REVIEWER"]),
    HIRING_MANAGER: principal(["HIRING_MANAGER"]),
    ADMIN: principal(["ADMIN"]),
    AUDITOR: principal(["AUDITOR"]),
  };
  const operations = [
    {
      name: "job.draft.read",
      allowed: new Set(["HIRING_REVIEWER", "HIRING_MANAGER", "ADMIN"]),
      read: (actor, executor = database.database) =>
        staffReads.readStaffJob(actor, phase2BFixtures.jobId, executor),
    },
    {
      name: "application.contact.read",
      allowed: new Set(["HIRING_REVIEWER", "HIRING_MANAGER", "ADMIN"]),
      read: (actor, executor = database.database) =>
        staffReads.readStaffApplicationContact(actor, phase2BFixtures.applicationId, executor),
    },
    {
      name: "audit.events.read",
      allowed: new Set(["HIRING_MANAGER", "ADMIN", "AUDITOR"]),
      read: (actor, executor = database.database) =>
        staffReads.readStaffAuditEvents(actor, executor),
    },
  ];

  for (const operation of operations) {
    for (const [role, actor] of Object.entries(principals)) {
      if (operation.allowed.has(role)) {
        await operation.read(actor);
      } else {
        let queryCount = 0;
        await expectUnavailable(() =>
          operation.read(actor, {
            query: async () => {
              queryCount += 1;
              throw new Error("Unauthorized read reached PostgreSQL.");
            },
          }),
        );
        assert.equal(queryCount, 0, `${role} queried PostgreSQL for ${operation.name}.`);
      }
    }
  }

  for (const actor of [
    null,
    principal([], "aal2"),
    principal(["OWNER"], "aal2"),
    principal(["HIRING_REVIEWER"], "aal1"),
  ]) {
    let queryCount = 0;
    await expectUnavailable(() =>
      staffReads.readStaffApplicationContact(actor, phase2BFixtures.applicationId, {
        query: async () => {
          queryCount += 1;
          throw new Error("Denied candidate read reached PostgreSQL.");
        },
      }),
    );
    assert.equal(queryCount, 0);
  }

  const disabledPrincipal = await session.resolveAuthenticatedStaff(() =>
    Promise.resolve({
      subjectId: "synthetic-supabase-subject-disabled",
      assuranceLevel: "aal2",
    }),
  );
  assert.equal(disabledPrincipal, null);
  await expectUnavailable(() =>
    staffReads.readStaffApplicationContact(disabledPrincipal, phase2BFixtures.applicationId, {
      query: async () => {
        throw new Error("Disabled candidate read reached PostgreSQL.");
      },
    }),
  );

  const reviewerJob = await staffReads.readStaffJob(
    principals.HIRING_REVIEWER,
    phase2BFixtures.jobId,
  );
  assert.deepEqual(Object.keys(reviewerJob).sort(), [
    "departmentName",
    "detailLevel",
    "id",
    "lifecycleState",
    "title",
  ]);
  assert.equal(reviewerJob.detailLevel, "APPLICATION_CONTEXT");

  const managerJob = await staffReads.readStaffJob(
    principals.HIRING_MANAGER,
    phase2BFixtures.jobId,
  );
  assert.equal(managerJob.detailLevel, "MANAGEMENT");
  assert.equal(managerJob.slug, "synthetic-phase-2b-role");

  const application = await staffReads.readStaffApplicationContact(
    principals.HIRING_REVIEWER,
    phase2BFixtures.applicationId,
  );
  assert.deepEqual(Object.keys(application).sort(), [
    "applicationType",
    "city",
    "createdAt",
    "email",
    "expiresAt",
    "fullName",
    "hiringStatus",
    "id",
    "jobId",
    "phoneOrWhatsApp",
    "publicReference",
    "technicalStatus",
  ]);
  const applicationPayload = JSON.stringify(application);
  for (const excluded of [
    "shortIntroduction",
    "answers",
    "accommodationContactRequested",
    "driveFileId",
    "contentHash",
    "retentionPolicyId",
  ]) {
    assert(!applicationPayload.includes(excluded), `Application DTO exposed ${excluded}.`);
  }

  const auditEvents = await staffReads.readStaffAuditEvents(principals.AUDITOR);
  assert(auditEvents.length > 0, "No synthetic audit evidence was available.");
  for (const event of auditEvents) {
    assert.deepEqual(Object.keys(event).sort(), [
      "actionCode",
      "actorType",
      "correlationId",
      "id",
      "occurredAt",
      "outcome",
      "reasonCode",
      "targetId",
      "targetType",
    ]);
  }
  const managerAudit = await staffReads.readStaffAuditEvents(principals.HIRING_MANAGER);
  assert(
    managerAudit.every((event) => ["APPLICATION", "CANDIDATE_FILE", "JOB"].includes(event.targetType)),
    "Hiring-manager audit read escaped the recruitment-only boundary.",
  );

  const multiRole = await session.resolveAuthenticatedStaff(() =>
    Promise.resolve({
      subjectId: phase2CFixtures.subjects.multiRole,
      assuranceLevel: "aal2",
    }),
  );
  assert.deepEqual(multiRole?.roles, ["CONTENT_EDITOR", "AUDITOR"]);
  await staffReads.readStaffAuditEvents(multiRole);
  await expectUnavailable(() =>
    staffReads.readStaffApplicationContact(multiRole, phase2BFixtures.applicationId, {
      query: async () => {
        throw new Error("Multiple-role denial reached PostgreSQL.");
      },
    }),
  );

  const summary = staffReads.staffSessionSummary(principals.HIRING_REVIEWER);
  assert.deepEqual(Object.keys(summary).sort(), [
    "assuranceLevel",
    "authorizationState",
    "roles",
    "staffUserId",
  ]);
  assert(!("authSubjectId" in summary));
  assert(!/token|cookie|password|totp/i.test(JSON.stringify(summary)));
  assert.throws(
    () => staffReads.staffSessionSummary(principal(["ADMIN"], "aal1")),
    { name: "StaffReadUnavailableError", message: "Not available." },
  );

  let malformedQueryCount = 0;
  await expectUnavailable(() =>
    staffReads.readStaffApplicationContact(principals.HIRING_REVIEWER, "not-a-uuid", {
      query: async () => {
        malformedQueryCount += 1;
        return { rows: [] };
      },
    }),
  );
  assert.equal(malformedQueryCount, 0);
  await expectUnavailable(() =>
    staffReads.readStaffApplicationContact(principals.HIRING_REVIEWER, nonexistentId),
  );
  await expectUnavailable(() => staffReads.readStaffJob(principals.HIRING_REVIEWER, nonexistentId));

  let expiredQueryCount = 0;
  await expectUnavailable(
    () =>
      staffReads.readStaffApplicationContact(principals.HIRING_REVIEWER, phase2BFixtures.applicationId, {
        query: async () => {
          expiredQueryCount += 1;
          if (expiredQueryCount === 1) {
            return {
              rows: [{
                technicalStatus: "SUBMITTED",
                hiringStatus: "NEW",
                retentionPermitsAccess: false,
                deletionCompleted: false,
              }],
            };
          }
          throw new Error("Protected application DTO query ran after state denial.");
        },
      }),
    "AuthorizationDeniedError",
  );
  assert.equal(expiredQueryCount, 1);

  assert.equal(
    authorization.authorizeBeforeTargetStateLookup(principals.HIRING_REVIEWER, {
      operation: "application.contact.read",
      target: { type: "APPLICATION", id: phase2BFixtures.applicationId },
    }).allowed,
    true,
  );
  assert.equal(
    authorization.authorize(principals.HIRING_REVIEWER, {
      operation: "application.contact.read",
      target: {
        type: "APPLICATION",
        id: phase2BFixtures.applicationId,
        state: {
          technicalStatus: "SUBMITTED",
          retentionPermitsAccess: false,
          deletionCompleted: false,
          inRecruitmentScope: true,
        },
      },
    }).reasonCode,
    "STATE_DENIED",
  );

  await verifyRolledBack(async (executor) => {
    await executor.query(
      `UPDATE public."StaffUser"
       SET "status" = 'DISABLED', "disabledAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1`,
      [phase2CFixtures.contentEditorStaffId],
    );
    const denied = await session.resolveAuthenticatedStaff(
      () => Promise.resolve({
        subjectId: phase2CFixtures.subjects.contentEditor,
        assuranceLevel: "aal2",
      }),
      (subjectId) => staffRepository.findStaffAuthorizationProfile(subjectId, executor),
    );
    assert.equal(denied, null, "Disabled local staff remained authorized on the next read.");
  });

  await verifyRolledBack(async (executor) => {
    await executor.query(
      `UPDATE public."UserRole" SET "revokedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
      [phase2CFixtures.contentEditorRoleId],
    );
    const denied = await session.resolveAuthenticatedStaff(
      () => Promise.resolve({
        subjectId: phase2CFixtures.subjects.contentEditor,
        assuranceLevel: "aal2",
      }),
      (subjectId) => staffRepository.findStaffAuthorizationProfile(subjectId, executor),
    );
    assert.equal(denied, null, "Role removal was not reflected on the next read.");
  });

  const restored = await session.resolveAuthenticatedStaff(() =>
    Promise.resolve({
      subjectId: phase2CFixtures.subjects.contentEditor,
      assuranceLevel: "aal2",
    }),
  );
  assert.deepEqual(restored?.roles, ["CONTENT_EDITOR"], "Lifecycle fixtures were not restored.");

  let currentClaims = {
    subjectId: phase2CFixtures.subjects.contentEditor,
    assuranceLevel: "aal2",
  };
  const claimsReader = () => Promise.resolve(currentClaims);
  assert(await session.resolveAuthenticatedStaff(claimsReader));
  currentClaims = null;
  assert.equal(
    await session.resolveAuthenticatedStaff(claimsReader),
    null,
    "A signed-out/expired claims state reused a stale application principal.",
  );
  assert.equal(
    await session.resolveAuthenticatedStaff(() =>
      Promise.resolve({ subjectId: "", assuranceLevel: "aal2" }),
    ),
    null,
  );

  const publicSecurity = await database.query(
    `SELECT COUNT(*)::integer AS "failures"
     FROM pg_tables
     WHERE schemaname = 'public'
       AND (
         rowsecurity = false
         OR has_table_privilege('anon', format('%I.%I', schemaname, tablename), 'SELECT,INSERT,UPDATE,DELETE')
         OR has_table_privilege('authenticated', format('%I.%I', schemaname, tablename), 'SELECT,INSERT,UPDATE,DELETE')
       )`,
  );
  assert.equal(publicSecurity.rows[0]?.failures, 0);
  const publicPolicies = await database.query(
    `SELECT COUNT(*)::integer AS "count" FROM pg_policies WHERE schemaname = 'public'`,
  );
  assert.equal(publicPolicies.rows[0]?.count, 0);

  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(packageJson.dependencies.pg, "8.23.0");
  assert.equal(packageJson.dependencies["@prisma/client"], undefined);
  assert.equal(packageJson.dependencies["@prisma/adapter-pg"], undefined);

  const staffReadSource = await readFile("src/lib/server/staff-reads.ts", "utf8");
  const routeSource = await readFile("src/app/api/internal/staff-auth/read/route.ts", "utf8");
  assert(!/SELECT\s+\*/i.test(staffReadSource));
  assert.match(routeSource, /dynamic = "force-dynamic"/);
  assert.match(routeSource, /revalidate = 0/);
  assert.match(routeSource, /private, no-store/);
  assert(!routeSource.includes("appendAuditEvent"));
  assert(!/console\.(log|error)/.test(routeSource));

  const safeDeniedPayload = JSON.stringify({ ok: false, code: "NOT_AVAILABLE" });
  assert(!safeDeniedPayload.includes("synthetic.candidate@example.invalid"));
  assert(!/sql|database_url|access_token|refresh_token|cookie|totp|stack/i.test(safeDeniedPayload));

  console.log("PHASE_2D_STAFF_READS_OK");
} finally {
  await database.closeDatabasePool();
}
