import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { config } from "dotenv";

import { phase2BFixtures } from "./seed-phase-2b-synthetic.mjs";
import { phase2CFixtures, seedPhase2CSynthetic } from "./seed-phase-2c-synthetic.mjs";

config({ path: ".env.local", quiet: true });

assert.equal(Number(process.versions.node.split(".")[0]), 22);

const database = await import("../src/lib/server/database.ts");
const authorization = await import("../src/lib/server/auth/authorization.ts");
const session = await import("../src/lib/server/auth/session.ts");
const staffNavigation = await import("../src/lib/server/staff-navigation.ts");
const staffReads = await import("../src/lib/server/staff-reads.ts");
const staffRepository = await import("../src/lib/server/repositories/staff.ts");
const redirects = await import("../src/lib/server/auth/redirects.ts");

function principal(roles, assuranceLevel = "aal2") {
  return {
    authSubjectId: "synthetic-phase-2e-subject",
    staffUserId: phase2CFixtures.contentEditorStaffId,
    assuranceLevel,
    roles,
  };
}

async function expectUnavailable(work) {
  await assert.rejects(work, (error) => {
    assert(["StaffReadUnavailableError", "AuthorizationDeniedError"].includes(error.name));
    assert.equal(error.message, "Not available.");
    return true;
  });
}

async function verifyRolledBack(work) {
  let completed = false;
  await assert.rejects(
    database.transaction(async (executor) => {
      await work(executor);
      completed = true;
      throw new Error("synthetic phase 2e rollback");
    }),
    { name: "DatabaseTransactionError", message: "Database transaction failed." },
  );
  assert.equal(completed, true);
}

try {
  await seedPhase2CSynthetic();

  const principals = {
    CONTENT_EDITOR: principal(["CONTENT_EDITOR"]),
    HIRING_REVIEWER: principal(["HIRING_REVIEWER"]),
    HIRING_MANAGER: principal(["HIRING_MANAGER"]),
    ADMIN: principal(["ADMIN"]),
    AUDITOR: principal(["AUDITOR"]),
    MULTIPLE: principal(["CONTENT_EDITOR", "AUDITOR"]),
    ZERO: principal([]),
    UNKNOWN: principal(["OWNER"]),
    AAL1: principal(["ADMIN"], "aal1"),
  };

  const expectedNavigation = {
    CONTENT_EDITOR: ["Content"],
    HIRING_REVIEWER: ["Jobs", "Applications"],
    HIRING_MANAGER: ["Jobs", "Applications", "Audit history"],
    ADMIN: ["Content", "Jobs", "Applications", "Audit history"],
    AUDITOR: ["Audit history"],
    MULTIPLE: ["Content", "Audit history"],
    ZERO: [],
    UNKNOWN: [],
    AAL1: [],
  };
  for (const [name, actor] of Object.entries(principals)) {
    assert.deepEqual(staffNavigation.staffPortalNavigation(actor).map((item) => item.label), expectedNavigation[name]);
  }

  const listMatrix = [
    [staffReads.listStaffContent, new Set(["CONTENT_EDITOR", "ADMIN"])],
    [staffReads.listStaffJobs, new Set(["HIRING_REVIEWER", "HIRING_MANAGER", "ADMIN"])],
    [staffReads.listStaffApplications, new Set(["HIRING_REVIEWER", "HIRING_MANAGER", "ADMIN"])],
    [staffReads.readStaffAuditEvents, new Set(["HIRING_MANAGER", "ADMIN", "AUDITOR"])],
  ];
  for (const [read, allowed] of listMatrix) {
    for (const name of ["CONTENT_EDITOR", "HIRING_REVIEWER", "HIRING_MANAGER", "ADMIN", "AUDITOR"]) {
      if (allowed.has(name)) continue;
      let queryCount = 0;
      await expectUnavailable(() => read(principals[name], {
        query: async () => {
          queryCount += 1;
          throw new Error("Denied list reached PostgreSQL.");
        },
      }));
      assert.equal(queryCount, 0);
    }
  }

  await verifyRolledBack(async (executor) => {
    await executor.query(
      `UPDATE public."Project" SET "publicationState" = 'DRAFT', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
      [phase2BFixtures.projectId],
    );
    const content = await staffReads.listStaffContent(principals.CONTENT_EDITOR, executor);
    assert(content.some((item) => item.id === phase2BFixtures.projectId));
    assert.deepEqual(Object.keys(content[0]).sort(), ["id", "publicationState", "title", "updatedAt"]);
  });

  const jobs = await staffReads.listStaffJobs(principals.HIRING_REVIEWER);
  assert(jobs.some((job) => job.id === phase2BFixtures.jobId));
  assert.deepEqual(Object.keys(jobs[0]).sort(), [
    "applicationDeadline", "departmentName", "id", "lifecycleState", "title",
  ]);

  const applications = await staffReads.listStaffApplications(principals.HIRING_REVIEWER);
  assert(applications.some((application) => application.id === phase2BFixtures.applicationId));
  assert.deepEqual(Object.keys(applications[0]).sort(), [
    "applicationType", "createdAt", "hiringStatus", "id", "jobTitle",
    "publicReference", "technicalStatus",
  ]);
  assert(!/email|phone|fullName|answer|file|consent|retention/i.test(JSON.stringify(applications)));

  const application = await staffReads.readStaffApplicationContact(
    principals.HIRING_REVIEWER,
    phase2BFixtures.applicationId,
  );
  assert.deepEqual(Object.keys(application).sort(), [
    "applicationType", "city", "createdAt", "email", "expiresAt", "fullName",
    "hiringStatus", "id", "jobId", "phoneOrWhatsApp", "publicReference", "technicalStatus",
  ]);
  assert(!/answers|accommodation|drive|hash|consent|retentionPolicy/i.test(JSON.stringify(application)));

  const audit = await staffReads.readStaffAuditEvents(principals.AUDITOR);
  assert(audit.length > 0);
  assert.deepEqual(Object.keys(audit[0]).sort(), [
    "actionCode", "actorType", "correlationId", "id", "occurredAt", "outcome",
    "reasonCode", "targetId", "targetType",
  ]);

  let malformedQueries = 0;
  await expectUnavailable(() => staffReads.readStaffApplicationContact(
    principals.HIRING_REVIEWER,
    "not-a-uuid",
    { query: async () => { malformedQueries += 1; return { rows: [] }; } },
  ));
  assert.equal(malformedQueries, 0);
  await expectUnavailable(() => staffReads.readStaffApplicationContact(
    principals.HIRING_REVIEWER,
    "00000000-0000-4000-8000-000000000099",
  ));

  let bolaQueries = 0;
  await expectUnavailable(() => staffReads.readStaffApplicationContact(
    principals.HIRING_REVIEWER,
    phase2BFixtures.applicationId,
    {
      query: async () => {
        bolaQueries += 1;
        if (bolaQueries === 1) {
          return { rows: [{ technicalStatus: "SUBMITTED", hiringStatus: "NEW", retentionPermitsAccess: true, deletionCompleted: false }] };
        }
        return { rows: [{ ...application, id: "00000000-0000-4000-8000-000000000099" }] };
      },
    },
  ));
  assert.equal(bolaQueries, 2, "The object mismatch check did not run at the DTO boundary.");

  for (const actor of [null, principals.ZERO, principals.UNKNOWN, principals.AAL1]) {
    let queryCount = 0;
    await expectUnavailable(() => staffReads.listStaffApplications(actor, {
      query: async () => { queryCount += 1; return { rows: [] }; },
    }));
    assert.equal(queryCount, 0);
  }

  await verifyRolledBack(async (executor) => {
    await executor.query(
      `UPDATE public."StaffUser" SET "status" = 'DISABLED', "disabledAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
      [phase2CFixtures.reviewerStaffId],
    );
    const disabled = await session.resolveAuthenticatedStaff(
      () => Promise.resolve({ subjectId: phase2CFixtures.subjects.reviewer, assuranceLevel: "aal2" }),
      (subjectId) => staffRepository.findStaffAuthorizationProfile(subjectId, executor),
    );
    assert.equal(disabled, null);
  });

  await verifyRolledBack(async (executor) => {
    await executor.query(
      `UPDATE public."UserRole" SET "revokedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
      [phase2CFixtures.reviewerRoleId],
    );
    const removed = await session.resolveAuthenticatedStaff(
      () => Promise.resolve({ subjectId: phase2CFixtures.subjects.reviewer, assuranceLevel: "aal2" }),
      (subjectId) => staffRepository.findStaffAuthorizationProfile(subjectId, executor),
    );
    assert.equal(removed, null);
  });

  let claims = { subjectId: phase2CFixtures.subjects.reviewer, assuranceLevel: "aal2" };
  const claimsReader = () => Promise.resolve(claims);
  assert(await session.resolveAuthenticatedStaff(claimsReader));
  claims = null;
  assert.equal(await session.resolveAuthenticatedStaff(claimsReader), null);

  assert.equal(redirects.safeStaffRedirectPath("/staff/applications?view=recent"), "/staff/applications?view=recent");
  for (const unsafe of ["https://example.com", "//example.com", "/staff\\example.com", "/careers"]) {
    assert.equal(redirects.safeStaffRedirectPath(unsafe), "/staff");
  }

  assert.equal(
    authorization.authorize(principals.HIRING_REVIEWER, {
      operation: "application.list_metadata",
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
    "src/lib/server/staff-reads.ts",
    "src/lib/server/staff-navigation.ts",
    "src/app/staff/actions.ts",
    "src/app/staff/page.tsx",
    "src/app/staff/layout.tsx",
    "src/components/staff/MfaExistingFactorChallenge.tsx",
    "src/lib/supabase/proxy.ts",
  ];
  const sources = await Promise.all(sourceFiles.map((file) => readFile(file, "utf8")));
  assert(!/SELECT\s+\*/i.test(sources.join("\n")));
  assert(!/console\.(log|error)|service_role|SUPABASE_SECRET_KEY|BEGIN PRIVATE KEY/i.test(sources.join("\n")));
  assert(!sources[5].includes(".auth.mfa.enroll("));
  assert.match(sources[5], /\.auth\.mfa\.listFactors\(\)/);
  assert.match(sources[5], /\.auth\.mfa\.challenge\(/);
  assert.match(sources[5], /\.auth\.mfa\.verify\(/);
  assert.match(sources[2], /safeStaffRedirectPath/);
  assert.match(sources[2], /signOut\(\{ scope: "global" \}\)/);
  assert.match(sources[2], /status=signout_failed/);
  assert.match(sources[6], /private, no-store, max-age=0/);
  assert.match(await readFile("src/proxy.ts", "utf8"), /\/staff\/:path\*/);

  console.log("PHASE_2E_STAFF_PORTAL_OK");
} finally {
  await database.closeDatabasePool();
}
