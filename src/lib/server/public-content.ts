import "server-only";
import { database, type DatabaseExecutor } from "./database.ts";
import { safeProjectMediaPath } from "./staff-workflows.ts";
import { containsFixtureContent, narrativeParagraphs } from "./narrative.ts";

export type PublicJob = { slug: string; title: string; summary: string; department: string; location: string;
  workArrangement: string; employmentType: string; experienceLevel: string; shiftSchedule: string;
  applicationDeadline: Date | null; responsibilities: string[]; requiredQualifications: string[];
  preferredQualifications: string[]; hiringProcessCopy: string[]; compensationMode: string;
  compensationMinMinor: string | null; compensationMaxMinor: string | null; compensationCurrency: string | null;
  compensationPeriod: string | null; compensationText: string | null };
export async function listPublicJobs(executor: DatabaseExecutor = database): Promise<PublicJob[]> {
  if (executor === database && !process.env.DATABASE_URL?.trim()) return [];
  const rows = (await executor.query<PublicJob>(
    `SELECT j."slug", j."title", j."summary", d."name" AS "department", l."label" AS "location",
      j."workArrangement", j."employmentType", j."experienceLevel", j."shiftSchedule", j."applicationDeadline",
      j."responsibilities", j."requiredQualifications", j."preferredQualifications", j."hiringProcessCopy",
      j."compensationMode", j."compensationMinMinor"::text, j."compensationMaxMinor"::text,
      j."compensationCurrency", j."compensationPeriod", j."compensationText"
     FROM public."Job" j JOIN public."Department" d ON d."id"=j."departmentId" JOIN public."JobLocation" l ON l."id"=j."jobLocationId"
     WHERE j."lifecycleState"='PUBLISHED' AND j."publishedAt" IS NOT NULL AND j."closedAt" IS NULL AND j."archivedAt" IS NULL
       AND (j."publishAt" IS NULL OR j."publishAt"<=CURRENT_TIMESTAMP)
       AND (j."applicationDeadline" IS NULL OR j."applicationDeadline">CURRENT_TIMESTAMP) AND d."active" AND l."active"
       AND concat_ws(' ',j."slug",j."title",j."summary",j."responsibilities"::text,j."requiredQualifications"::text,j."hiringProcessCopy"::text) !~* '(synthetic|fixture|prototype)'
     ORDER BY j."publishedAt" DESC, j."id" LIMIT 100`)).rows;
  return rows.filter((row) => !containsFixtureContent(row)).flatMap((row) => {
    const responsibilities = narrativeParagraphs(row.responsibilities), requiredQualifications = narrativeParagraphs(row.requiredQualifications);
    const preferredQualifications = narrativeParagraphs(row.preferredQualifications), hiringProcessCopy = narrativeParagraphs(row.hiringProcessCopy);
    return responsibilities?.length && requiredQualifications?.length && preferredQualifications && hiringProcessCopy?.length
      ? [{ ...row, responsibilities, requiredQualifications, preferredQualifications, hiringProcessCopy }] : [];
  });
}
export type PublicProject = { slug: string; title: string; summary: string; clientDescriptor: string | null; year: number | null;
  brief: string | null; challenge: string[]; approach: string[]; outcome: string[];
  disciplines: string[]; sectors: string[]; media: { path: string; altText: string; caption: string | null }[];
  credits: { displayName: string; role: string; approvedUrl: string | null }[] };
export async function listPublicProjects(executor: DatabaseExecutor = database): Promise<PublicProject[]> {
  if (executor === database && !process.env.DATABASE_URL?.trim()) return [];
  const rows = (await executor.query<PublicProject>(
    `SELECT p."slug", p."title", p."summary", p."clientDescriptor", p."year", p."brief", p."challenge", p."approach", p."outcome",
     COALESCE((SELECT jsonb_agg(d."name" ORDER BY d."sortOrder") FROM public."ProjectDiscipline" pd JOIN public."Discipline" d ON d."id"=pd."disciplineId" WHERE pd."projectId"=p."id" AND d."active"),'[]'::jsonb) AS "disciplines",
     COALESCE((SELECT jsonb_agg(s."name" ORDER BY s."sortOrder") FROM public."ProjectSector" ps JOIN public."Sector" s ON s."id"=ps."sectorId" WHERE ps."projectId"=p."id" AND s."active"),'[]'::jsonb) AS "sectors",
     COALESCE((SELECT jsonb_agg(jsonb_build_object('path',m."publicDeliveryPath",'altText',m."altText",'caption',m."caption") ORDER BY m."sortOrder") FROM public."ProjectMedia" m WHERE m."projectId"=p."id" AND m."mediaType"='IMAGE'),'[]'::jsonb) AS "media",
     COALESCE((SELECT jsonb_agg(jsonb_build_object('displayName',c."displayName",'role',c."role",'approvedUrl',c."approvedUrl") ORDER BY c."sortOrder") FROM public."ProjectCredit" c WHERE c."projectId"=p."id"),'[]'::jsonb) AS "credits"
     FROM public."Project" p WHERE p."publicationState"='PUBLISHED' AND p."publishedAt" IS NOT NULL AND p."archivedAt" IS NULL
       AND (p."publishAt" IS NULL OR p."publishAt"<=CURRENT_TIMESTAMP)
       AND concat_ws(' ',p."slug",p."title",p."summary",p."clientDescriptor",p."brief",p."challenge"::text,p."approach"::text,p."outcome"::text) !~* '(synthetic|fixture|prototype)'
     ORDER BY p."featured" DESC, p."publishedAt" DESC, p."id" LIMIT 100`)).rows;
  return rows.filter((p) => !containsFixtureContent(p) && p.media.length > 0 && p.media.every((m) => safeProjectMediaPath(m.path) && Boolean(m.altText?.trim()))
    && p.disciplines.length > 0 && p.sectors.length > 0).flatMap((p) => {
      const challenge = narrativeParagraphs(p.challenge), approach = narrativeParagraphs(p.approach), outcome = narrativeParagraphs(p.outcome);
      return challenge?.length && approach?.length && outcome?.length ? [{ ...p, challenge, approach, outcome }] : [];
    });
}
