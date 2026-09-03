import "server-only";

import { database, type DatabaseExecutor } from "../database.ts";

export type StaffRole =
  | "CONTENT_EDITOR"
  | "HIRING_REVIEWER"
  | "HIRING_MANAGER"
  | "ADMIN"
  | "AUDITOR";

export type StaffStatus = "ACTIVE" | "DISABLED";

export type StaffAuthorizationProfile = Readonly<{
  staffUserId: string;
  status: StaffStatus;
  roles: StaffRole[];
}>;

interface StaffAuthorizationRow {
  staffUserId: string;
  status: StaffStatus;
  roleCodes: unknown;
}

const STAFF_ROLES = new Set<StaffRole>([
  "CONTENT_EDITOR",
  "HIRING_REVIEWER",
  "HIRING_MANAGER",
  "ADMIN",
  "AUDITOR",
]);

function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && STAFF_ROLES.has(value as StaffRole);
}

export async function findStaffAuthorizationProfile(
  supabaseUserId: string,
  executor: DatabaseExecutor = database,
): Promise<StaffAuthorizationProfile | null> {
  const result = await executor.query<StaffAuthorizationRow>(
    `SELECT staff."id" AS "staffUserId", staff."status",
            COALESCE(
              jsonb_agg(role."roleCode"::text ORDER BY role."roleCode")
                FILTER (WHERE role."revokedAt" IS NULL),
              '[]'::jsonb
            ) AS "roleCodes"
     FROM public."StaffUser" staff
     LEFT JOIN public."UserRole" role ON role."staffUserId" = staff."id"
     WHERE staff."supabaseUserId" = $1
     GROUP BY staff."id", staff."status"`,
    [supabaseUserId],
  );
  const row = result.rows[0];
  if (!row) return null;

  return {
    staffUserId: row.staffUserId,
    status: row.status,
    roles: Array.isArray(row.roleCodes) ? row.roleCodes.filter(isStaffRole) : [],
  };
}

export async function getEffectiveStaffRoles(
  supabaseUserId: string,
  executor: DatabaseExecutor = database,
): Promise<StaffRole[]> {
  const profile = await findStaffAuthorizationProfile(supabaseUserId, executor);
  return profile?.status === "ACTIVE" ? profile.roles : [];
}

export async function setStaffStatus(
  staffUserId: string,
  status: StaffStatus,
  executor: DatabaseExecutor = database,
) {
  const result = await executor.query<{ id: string }>(
    `UPDATE public."StaffUser"
     SET "status" = $2::public."StaffStatus",
         "disabledAt" = CASE WHEN $2 = 'DISABLED' THEN CURRENT_TIMESTAMP ELSE NULL END,
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = $1
     RETURNING "id"`,
    [staffUserId, status],
  );
  return result.rows[0]?.id === staffUserId;
}
