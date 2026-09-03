import { pathToFileURL } from "node:url";

import { config } from "dotenv";

import { phase2BFixtures, seedPhase2BSynthetic } from "./seed-phase-2b-synthetic.mjs";

config({ path: ".env.local", quiet: true });

export const phase2CFixtures = Object.freeze({
  contentEditorStaffId: "00000000-0000-4000-8000-000000000020",
  contentEditorRoleId: "00000000-0000-4000-8000-000000000021",
  reviewerStaffId: "00000000-0000-4000-8000-000000000022",
  reviewerRoleId: "00000000-0000-4000-8000-000000000023",
  managerStaffId: "00000000-0000-4000-8000-000000000024",
  managerRoleId: "00000000-0000-4000-8000-000000000025",
  auditorStaffId: "00000000-0000-4000-8000-000000000026",
  auditorRoleId: "00000000-0000-4000-8000-000000000027",
  zeroRoleStaffId: "00000000-0000-4000-8000-000000000028",
  multiRoleStaffId: "00000000-0000-4000-8000-000000000029",
  multiContentRoleId: "00000000-0000-4000-8000-00000000002a",
  multiAuditRoleId: "00000000-0000-4000-8000-00000000002b",
  subjects: Object.freeze({
    contentEditor: "970e45fc-73cc-4f81-99e7-332aac583fee",
    reviewer: "synthetic-phase-2c-hiring-reviewer",
    manager: "synthetic-phase-2c-hiring-manager",
    auditor: "synthetic-phase-2c-auditor",
    zeroRole: "synthetic-phase-2c-zero-role",
    multiRole: "synthetic-phase-2c-multiple-roles",
  }),
});

export async function seedPhase2CSynthetic() {
  await seedPhase2BSynthetic();
  const { transaction } = await import("../src/lib/server/database.ts");
  const fixture = phase2CFixtures;
  const staff = [
    [fixture.contentEditorStaffId, fixture.subjects.contentEditor],
    [fixture.reviewerStaffId, fixture.subjects.reviewer],
    [fixture.managerStaffId, fixture.subjects.manager],
    [fixture.auditorStaffId, fixture.subjects.auditor],
    [fixture.zeroRoleStaffId, fixture.subjects.zeroRole],
    [fixture.multiRoleStaffId, fixture.subjects.multiRole],
  ];
  const roles = [
    [fixture.contentEditorRoleId, fixture.contentEditorStaffId, "CONTENT_EDITOR"],
    [fixture.reviewerRoleId, fixture.reviewerStaffId, "HIRING_REVIEWER"],
    [fixture.managerRoleId, fixture.managerStaffId, "HIRING_MANAGER"],
    [fixture.auditorRoleId, fixture.auditorStaffId, "AUDITOR"],
    [fixture.multiContentRoleId, fixture.multiRoleStaffId, "CONTENT_EDITOR"],
    [fixture.multiAuditRoleId, fixture.multiRoleStaffId, "AUDITOR"],
  ];

  await transaction(async (database) => {
    for (const [id, subject] of staff) {
      await database.query(
        `INSERT INTO public."StaffUser" ("id", "supabaseUserId", "status", "updatedAt")
         VALUES ($1, $2, 'ACTIVE', CURRENT_TIMESTAMP)
         ON CONFLICT ("id") DO UPDATE SET
           "supabaseUserId" = EXCLUDED."supabaseUserId",
           "status" = 'ACTIVE',
           "disabledAt" = NULL,
           "updatedAt" = CURRENT_TIMESTAMP`,
        [id, subject],
      );
    }
    for (const [id, staffUserId, roleCode] of roles) {
      await database.query(
        `INSERT INTO public."UserRole" (
           "id", "staffUserId", "roleCode", "grantedByStaffUserId"
         ) VALUES ($1, $2, $3::public."StaffRole", $4)
         ON CONFLICT ("id") DO UPDATE SET "revokedAt" = NULL`,
        [id, staffUserId, roleCode, phase2BFixtures.adminStaffId],
      );
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const database = await import("../src/lib/server/database.ts");
  try {
    await seedPhase2CSynthetic();
    console.log("PHASE_2C_SYNTHETIC_SEED_OK");
  } finally {
    await database.closeDatabasePool();
  }
}
