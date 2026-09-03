import "server-only";

import { database, type DatabaseExecutor } from "../database.ts";

export type StaffRole =
  | "CONTENT_EDITOR"
  | "HIRING_REVIEWER"
  | "HIRING_MANAGER"
  | "ADMIN"
  | "AUDITOR";

interface StaffRoleRow {
  roleCode: StaffRole;
}
export async function getEffectiveStaffRoles(
  supabaseUserId: string,
  executor: DatabaseExecutor = database,
): Promise<StaffRole[]> {
  const result = await executor.query<StaffRoleRow>(
    `SELECT role."roleCode"
     FROM public."StaffUser" staff
     JOIN public."UserRole" role ON role."staffUserId" = staff."id"
     WHERE staff."supabaseUserId" = $1
       AND staff."status" = 'ACTIVE'
       AND role."revokedAt" IS NULL
     ORDER BY role."roleCode"`,
    [supabaseUserId],
  );
  return result.rows.map((row) => row.roleCode);
}
