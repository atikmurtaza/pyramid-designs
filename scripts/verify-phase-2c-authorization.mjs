import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { config } from "dotenv";

import { phase2BFixtures } from "./seed-phase-2b-synthetic.mjs";
import { phase2CFixtures, seedPhase2CSynthetic } from "./seed-phase-2c-synthetic.mjs";

config({ path: ".env.local", quiet: true });

assert.equal(
  Number(process.versions.node.split(".")[0]),
  22,
  "Phase 2C authorization verification must run under Node.js 22.",
);

const database = await import("../src/lib/server/database.ts");
const staffRepository = await import("../src/lib/server/repositories/staff.ts");
const auditRepository = await import("../src/lib/server/repositories/audit.ts");
const session = await import("../src/lib/server/auth/session.ts");
const authorization = await import("../src/lib/server/auth/authorization.ts");
const redirects = await import("../src/lib/server/auth/redirects.ts");
const csrf = await import("../src/lib/server/auth/csrf.ts");

const targetId = "00000000-0000-4000-8000-00000000002f";
const submittedState = {
  technicalStatus: "SUBMITTED",
  hiringStatus: "NEW",
  requestedHiringStatus: "UNDER_REVIEW",
  retentionPermitsAccess: true,
  deletionCompleted: false,
  inRecruitmentScope: true,
};
const clearedFileState = {
  validationStatus: "PASSED",
  fileTechnicalStatus: "QUARANTINED",
  securityStatus: "CLEARED",
  retentionPermitsAccess: true,
  deletionCompleted: false,
  hashMatchesReview: true,
};
const quarantinedFileState = {
  validationStatus: "PASSED",
  fileTechnicalStatus: "QUARANTINED",
  securityStatus: "UNREVIEWED",
  retentionPermitsAccess: true,
  deletionCompleted: false,
};

function principal(roles, assuranceLevel = "aal2") {
  return {
    authSubjectId: "synthetic-phase-2c-subject",
    staffUserId: targetId,
    assuranceLevel,
    roles,
  };
}

function decision(roles, operation, target) {
  return authorization.authorize(principal(roles), { operation, target });
}

try {
  await seedPhase2CSynthetic();

  const subjectFixtures = [
    [phase2CFixtures.subjects.contentEditor, ["CONTENT_EDITOR"]],
    [phase2CFixtures.subjects.reviewer, ["HIRING_REVIEWER"]],
    [phase2CFixtures.subjects.manager, ["HIRING_MANAGER"]],
    ["synthetic-supabase-subject-admin", ["ADMIN"]],
    [phase2CFixtures.subjects.auditor, ["AUDITOR"]],
  ];
  for (const [subjectId, expectedRoles] of subjectFixtures) {
    const resolved = await session.resolveAuthenticatedStaff(() =>
      Promise.resolve({ subjectId, assuranceLevel: "aal2" }),
    );
    assert.deepEqual(resolved?.roles, expectedRoles, `Role resolution failed for ${subjectId}.`);
  }

  assert.equal(
    await session.resolveAuthenticatedStaff(() => Promise.resolve(null)),
    null,
    "An invalid or absent session was accepted.",
  );
  assert.equal(
    await session.resolveAuthenticatedStaff(() =>
      Promise.resolve({ subjectId: "synthetic-unmapped-subject", assuranceLevel: "aal2" }),
    ),
    null,
    "An unmapped Auth subject was accepted.",
  );
  assert.equal(
    await session.resolveAuthenticatedStaff(() =>
      Promise.resolve({
        subjectId: "synthetic-supabase-subject-disabled",
        assuranceLevel: "aal2",
      }),
    ),
    null,
    "A disabled staff profile retained permissions.",
  );
  assert.equal(
    await session.resolveAuthenticatedStaff(() =>
      Promise.resolve({ subjectId: phase2CFixtures.subjects.zeroRole, assuranceLevel: "aal2" }),
    ),
    null,
    "A staff profile with zero roles was accepted.",
  );
  const multiRole = await session.resolveAuthenticatedStaff(() =>
    Promise.resolve({ subjectId: phase2CFixtures.subjects.multiRole, assuranceLevel: "aal2" }),
  );
  assert.deepEqual(multiRole?.roles, ["CONTENT_EDITOR", "AUDITOR"]);

  assert.equal(
    decision(["CONTENT_EDITOR"], "content.edit", {
      type: "CONTENT",
      id: targetId,
      state: { publicationState: "DRAFT" },
    }).allowed,
    true,
  );
  assert.equal(
    decision(["CONTENT_EDITOR"], "content.create", { type: "CONTENT" }).allowed,
    true,
  );
  assert.equal(
    decision(["CONTENT_EDITOR"], "content.publish", {
      type: "CONTENT",
      id: targetId,
      state: { publicationState: "DRAFT", approvedContent: true },
    }).allowed,
    true,
  );
  assert.equal(
    decision(["CONTENT_EDITOR"], "content.archive", {
      type: "CONTENT",
      id: targetId,
      state: { publicationState: "PUBLISHED" },
    }).allowed,
    true,
  );
  assert.equal(
    decision(["CONTENT_EDITOR"], "application.contact.read", {
      type: "APPLICATION",
      id: targetId,
      state: submittedState,
    }).allowed,
    false,
  );
  assert.equal(
    decision(["CONTENT_EDITOR"], "staff.manage", { type: "STAFF", id: targetId }).allowed,
    false,
  );
  assert.equal(
    decision(["CONTENT_EDITOR"], "audit.events.read", { type: "AUDIT" }).allowed,
    false,
  );

  assert.equal(
    decision(["HIRING_REVIEWER"], "application.contact.read", {
      type: "APPLICATION",
      id: targetId,
      state: submittedState,
    }).allowed,
    true,
  );
  assert.equal(
    decision(["HIRING_REVIEWER"], "candidate_file.cleared.download", {
      type: "CANDIDATE_FILE",
      id: targetId,
      state: clearedFileState,
    }).allowed,
    true,
  );
  assert.equal(
    decision(["HIRING_REVIEWER"], "candidate_file.security_review.retrieve_quarantine", {
      type: "CANDIDATE_FILE",
      id: targetId,
      state: quarantinedFileState,
    }).allowed,
    false,
  );
  assert.equal(
    decision(["HIRING_REVIEWER"], "staff.manage", { type: "STAFF", id: targetId }).allowed,
    false,
  );

  assert.equal(
    decision(["HIRING_MANAGER"], "application.hiring_status.change", {
      type: "APPLICATION",
      id: targetId,
      state: submittedState,
    }).allowed,
    true,
  );
  assert.equal(
    decision(["HIRING_REVIEWER"], "application.hiring_status.change", {
      type: "APPLICATION",
      id: targetId,
      state: { ...submittedState, requestedHiringStatus: "WITHDRAWN" },
    }).allowed,
    false,
  );
  assert.equal(
    decision(["HIRING_MANAGER"], "application.withdraw.record", {
      type: "APPLICATION",
      id: targetId,
      state: {
        technicalStatus: "SECURITY_PENDING",
        deletionCompleted: false,
        inRecruitmentScope: true,
      },
    }).allowed,
    true,
  );
  assert.equal(
    decision(["HIRING_MANAGER"], "candidate_file.security_review.retrieve_quarantine", {
      type: "CANDIDATE_FILE",
      id: targetId,
      state: quarantinedFileState,
    }).allowed,
    true,
  );
  assert.equal(
    decision(["HIRING_MANAGER"], "content.publish", {
      type: "CONTENT",
      id: targetId,
    }).allowed,
    false,
  );

  assert.equal(
    decision(["ADMIN"], "staff.manage", { type: "STAFF", id: targetId }).allowed,
    true,
  );
  assert.equal(
    decision(["ADMIN"], "retention.deletion.execute", {
      type: "RETENTION",
      id: targetId,
      state: { deletionRequested: false, deletionCompleted: false },
    }).allowed,
    false,
  );
  assert.equal(
    decision(["ADMIN"], "candidate_file.cleared.download", {
      type: "CANDIDATE_FILE",
      id: targetId,
      state: quarantinedFileState,
    }).allowed,
    false,
    "ADMIN bypassed the cleared-file state gate.",
  );
  assert.equal(
    decision(["ADMIN"], "candidate_file.security_review.retrieve_quarantine", {
      type: "CANDIDATE_FILE",
      id: targetId,
      state: { ...quarantinedFileState, validationStatus: "FAILED" },
    }).allowed,
    false,
    "ADMIN bypassed the validation state gate.",
  );

  assert.equal(
    decision(["AUDITOR"], "audit.events.read", { type: "AUDIT" }).allowed,
    true,
  );
  assert.equal(
    decision(["AUDITOR"], "application.note.create", {
      type: "APPLICATION",
      id: targetId,
      state: submittedState,
    }).allowed,
    false,
  );

  assert.deepEqual(
    authorization.authorize(null, {
      operation: "content.draft.read",
      target: { type: "CONTENT", id: targetId },
    }),
    { allowed: false, reasonCode: "AUTHENTICATION_REQUIRED" },
  );
  assert.equal(
    authorization.authorize(principal(["CONTENT_EDITOR"], "aal1"), {
      operation: "content.draft.read",
      target: { type: "CONTENT", id: targetId },
    }).reasonCode,
    "MFA_REQUIRED",
  );
  assert.equal(
    decision(["OWNER"], "content.draft.read", { type: "CONTENT", id: targetId }).reasonCode,
    "UNKNOWN_ROLE",
  );
  assert.equal(
    decision(["ADMIN"], "unknown.operation", { type: "CONTENT", id: targetId }).reasonCode,
    "UNKNOWN_OPERATION",
  );
  assert.equal(
    decision(["CONTENT_EDITOR"], "content.draft.read", { type: "APPLICATION", id: targetId })
      .reasonCode,
    "TARGET_MISMATCH",
  );
  assert.equal(
    authorization.authorize(principal(["CONTENT_EDITOR"]), {
      operation: "content.draft.read",
    }).reasonCode,
    "TARGET_REQUIRED",
  );
  assert.equal(
    decision(["HIRING_MANAGER"], "application.hiring_status.change", {
      type: "APPLICATION",
      id: targetId,
      state: { ...submittedState, requestedHiringStatus: "HIRED" },
    }).reasonCode,
    "STATE_DENIED",
  );

  assert.throws(
    () =>
      authorization.requireAuthorization(principal(["AUDITOR"]), {
        operation: "staff.manage",
        target: { type: "STAFF", id: targetId },
      }),
    { name: "AuthorizationDeniedError", message: "Not available." },
  );

  assert.equal(redirects.safeStaffRedirectPath("/staff/review?tab=synthetic"), "/staff/review?tab=synthetic");
  for (const unsafe of [
    "https://attacker.invalid/staff",
    "//attacker.invalid",
    "/contact",
    "/staff-evil",
    "/staff\\evil",
  ]) {
    assert.equal(redirects.safeStaffRedirectPath(unsafe), "/staff");
  }
  assert.equal(
    csrf.hasSameOriginMutation(
      new Request("https://pyramid.invalid/staff", {
        method: "POST",
        headers: { origin: "https://pyramid.invalid" },
      }),
    ),
    true,
  );
  assert.equal(
    csrf.hasSameOriginMutation(
      new Request("https://pyramid.invalid/staff", {
        method: "POST",
        headers: { origin: "https://attacker.invalid" },
      }),
    ),
    false,
  );
  assert.equal(csrf.hasSameOriginMutation(new Request("https://pyramid.invalid/staff")), false);

  let auditValues;
  await auditRepository.appendAuditEvent(
    {
      actorType: "STAFF",
      actorStaffUserId: phase2BFixtures.adminStaffId,
      actionCode: "phase2c.synthetic.authorization",
      targetType: "SYNTHETIC_CONTENT",
      targetId,
      outcome: "DENIED",
      reasonCode: "ROLE_DENIED",
      correlationId: "synthetic-phase-2c-audit",
      safeMetadata: { synthetic: true },
    },
    {
      query: async (_text, values) => {
        auditValues = values;
        return { rows: [] };
      },
    },
  );
  const auditPayload = JSON.stringify(auditValues);
  assert(!auditPayload.includes("@"));
  assert(!/password|access_token|refresh_token|totp/i.test(auditPayload));

  const publicRoleSecurity = await database.query(
    `SELECT role_name,
            has_table_privilege(role_name, 'public."StaffUser"', 'SELECT') AS can_read_staff,
            has_table_privilege(role_name, 'public."UserRole"', 'SELECT') AS can_read_roles
     FROM unnest(ARRAY['anon', 'authenticated']) AS role_name
     ORDER BY role_name`,
  );
  assert(
    publicRoleSecurity.rows.every((row) => !row.can_read_staff && !row.can_read_roles),
    "A Supabase browser role can read staff authorization tables.",
  );

  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(packageJson.dependencies["@supabase/ssr"], "0.12.5");
  assert.equal(packageJson.dependencies["@supabase/supabase-js"], "2.115.0");
  assert.equal(packageJson.dependencies["@prisma/client"], undefined);
  assert.equal(packageJson.dependencies["@prisma/adapter-pg"], undefined);
  assert.equal(await staffRepository.getEffectiveStaffRoles(phase2CFixtures.subjects.zeroRole).then((roles) => roles.length), 0);

  let statusUpdate;
  assert.equal(
    await staffRepository.setStaffStatus(
      phase2CFixtures.contentEditorStaffId,
      "DISABLED",
      {
        query: async (text, values) => {
          statusUpdate = { text, values };
          return { rows: [{ id: phase2CFixtures.contentEditorStaffId }] };
        },
      },
    ),
    true,
  );
  assert.match(statusUpdate.text, /"disabledAt" = CASE/);
  assert.deepEqual(statusUpdate.values, [phase2CFixtures.contentEditorStaffId, "DISABLED"]);

  console.log("PHASE_2C_AUTHORIZATION_OK");
} finally {
  await database.closeDatabasePool();
}
