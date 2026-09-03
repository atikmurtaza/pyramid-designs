import "server-only";

import { database, type DatabaseExecutor } from "../database.ts";

export interface PublishedProject {
  id: string;
  slug: string;
  title: string;
  clientDescriptor: string | null;
  year: number | null;
  summary: string;
  featured: boolean;
  publishedAt: Date;
}

type PublishedProjectRow = PublishedProject;

export async function listPublishedProjects(
  executor: DatabaseExecutor = database,
): Promise<PublishedProject[]> {
  const result = await executor.query<PublishedProjectRow>(
    `SELECT "id", "slug", "title", "clientDescriptor", "year", "summary", "featured", "publishedAt"
     FROM public."Project"
     WHERE "publicationState" = 'PUBLISHED'
       AND "publishedAt" IS NOT NULL
       AND ("publishAt" IS NULL OR "publishAt" <= CURRENT_TIMESTAMP)
     ORDER BY "featured" DESC, "publishedAt" DESC, "id"`,
  );
  return result.rows.map((row) => ({ ...row }));
}
