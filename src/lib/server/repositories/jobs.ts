import "server-only";

import { database, type DatabaseExecutor } from "../database.ts";

export interface OpenJob {
  id: string;
  slug: string;
  title: string;
  departmentId: string;
  applicationDeadline: Date | null;
}

type OpenJobRow = OpenJob;

export async function findOpenJobBySlug(
  slug: string,
  executor: DatabaseExecutor = database,
): Promise<OpenJob | null> {
  const result = await executor.query<OpenJobRow>(
    `SELECT "id", "slug", "title", "departmentId", "applicationDeadline"
     FROM public."Job"
     WHERE "slug" = $1
       AND "lifecycleState" = 'PUBLISHED'
       AND ("publishAt" IS NULL OR "publishAt" <= CURRENT_TIMESTAMP)
       AND ("applicationDeadline" IS NULL OR CURRENT_TIMESTAMP < "applicationDeadline")
       AND "closedAt" IS NULL
     LIMIT 1`,
    [slug],
  );
  return result.rows[0] ? { ...result.rows[0] } : null;
}
