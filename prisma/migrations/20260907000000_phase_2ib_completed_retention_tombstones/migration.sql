-- Completed retention is independent of historical submission/security disposition.
-- The trusted server establishes external deletion; PostgreSQL enforces the complete
-- domain/evidence combination. No timestamp, enum, or caller session setting is authority.
CREATE FUNCTION public.completed_retention_evidence(application_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Application" a
    JOIN public."BackgroundJob" j ON j."applicationId" = a."id"
      AND j."jobType" = 'APPLICATION_RETENTION_DELETE' AND j."state" = 'SUCCEEDED'
      AND j."dedupeKey" = 'application-retention:' || a."id"::text
      AND j."candidateFileId" IS NULL AND j."payloadReference" IS NULL
      AND j."safePayload" = '{"version":1}'::jsonb
      AND j."claimToken" IS NULL AND j."leaseUntil" IS NULL
      AND j."attemptCount" > 0 AND j."completedAt" IS NOT NULL
    JOIN public."AuditEvent" started ON started."targetId" = a."id"
      AND started."targetType" = 'APPLICATION' AND started."actionCode" = 'RETENTION_STARTED'
      AND started."actorType" = 'SYSTEM' AND started."outcome" = 'SUCCEEDED'
      AND started."correlationId" = j."id"::text
    JOIN public."AuditEvent" finished ON finished."targetId" = a."id"
      AND finished."targetType" = 'APPLICATION' AND finished."actionCode" = 'RETENTION_COMPLETED'
      AND finished."actorType" = 'SYSTEM' AND finished."outcome" = 'SUCCEEDED'
      AND finished."correlationId" = j."id"::text
    WHERE a."id" = application_id AND a."deletionRequestedAt" IS NOT NULL
      AND a."deletionCompletedAt" >= a."deletionRequestedAt"
      AND a."expiresAt" <= a."deletionRequestedAt"
      AND started."safeMetadata" = jsonb_build_object('technicalStatus', a."technicalStatus", 'hiringStatus', a."hiringStatus")
      AND a."fullName" IS NULL AND a."email" IS NULL AND a."city" IS NULL
      AND a."phoneOrWhatsApp" IS NULL AND a."specialism" IS NULL
      AND a."portfolioUrl" IS NULL AND a."professionalUrl" IS NULL
      AND a."availabilityText" IS NULL AND a."remoteAvailable" IS NULL
      AND a."shortIntroduction" IS NULL AND a."preferredEngagement" IS NULL
      AND a."freelancerRateMinMinor" IS NULL AND a."freelancerRateMaxMinor" IS NULL
      AND a."rateCurrency" IS NULL AND NOT a."accommodationContactRequested"
      AND a."safeCampaignCode" IS NULL AND a."experienceLevel" = '' AND a."source" = ''
      AND NOT EXISTS (SELECT 1 FROM public."ApplicationAnswer" WHERE "applicationId" = a."id")
      AND NOT EXISTS (SELECT 1 FROM public."CandidateFile" f WHERE f."applicationId" = a."id"
        AND (f."technicalStatus" <> 'DELETED' OR f."driveFileId" IS NOT NULL
          OR f."driveZoneCode" IS NOT NULL OR f."contentHash" IS NOT NULL OR f."deletedAt" IS NULL
          OR NOT EXISTS (SELECT 1 FROM public."AuditEvent" intent WHERE intent."targetId" = f."id"
            AND intent."targetType" = 'CANDIDATE_FILE' AND intent."actionCode" = 'RETENTION_STORAGE_VERIFIED'
            AND intent."actorType" = 'SYSTEM' AND intent."outcome" = 'SUCCEEDED' AND intent."correlationId" = j."id"::text)
          OR NOT EXISTS (SELECT 1 FROM public."AuditEvent" e WHERE e."targetId" = f."id"
            AND e."targetType" = 'CANDIDATE_FILE' AND e."actionCode" = 'RETENTION_FILE_DELETED'
            AND e."actorType" = 'SYSTEM' AND e."outcome" = 'SUCCEEDED' AND e."correlationId" = j."id"::text)))
  );
$$;

ALTER TABLE public."Application" DROP CONSTRAINT "Application_portfolio_introduction_check",
  ADD CONSTRAINT "Application_portfolio_introduction_check" CHECK (
    "engagementType" <> 'PORTFOLIO_INTRODUCTION' OR "portfolioUrl" IS NOT NULL
    OR "professionalUrl" IS NOT NULL OR "deletionCompletedAt" IS NOT NULL);
-- The timestamp branch above is always backed by the deferred evidence trigger below.
ALTER TABLE public."CandidateFile" DROP CONSTRAINT "CandidateFile_clearance_check",
  ADD CONSTRAINT "CandidateFile_clearance_check" CHECK (
    ("technicalStatus" = 'DELETED' AND "deletedAt" IS NOT NULL
      AND "driveFileId" IS NULL AND "driveZoneCode" IS NULL AND "contentHash" IS NULL
      AND (("securityStatus" = 'CLEARED' AND "validationStatus" = 'PASSED'
            AND "clearanceMethod" IS NOT NULL AND "clearedAt" IS NOT NULL)
        OR ("securityStatus" <> 'CLEARED' AND "clearanceMethod" IS NULL AND "clearedAt" IS NULL)))
    OR ("technicalStatus" <> 'DELETED' AND (
      ("securityStatus" = 'CLEARED' AND "validationStatus" = 'PASSED' AND "technicalStatus" = 'QUARANTINED'
        AND "contentHash" IS NOT NULL AND "clearanceMethod" IS NOT NULL AND "clearedAt" IS NOT NULL)
      OR ("securityStatus" <> 'CLEARED' AND "clearanceMethod" IS NULL AND "clearedAt" IS NULL))));

CREATE FUNCTION public.guard_retention_application()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."deletionRequestedAt" IS NOT NULL OR NEW."deletionCompletedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'application cannot be inserted as a tombstone' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD."deletionCompletedAt" IS NOT NULL AND to_jsonb(NEW) - 'updatedAt' <> to_jsonb(OLD) - 'updatedAt' THEN
    RAISE EXCEPTION 'completed retention is irreversible' USING ERRCODE = '55000';
  END IF;
  IF NEW."deletionRequestedAt" IS NOT NULL THEN
    IF NEW."technicalStatus" IS DISTINCT FROM OLD."technicalStatus"
      OR NEW."hiringStatus" IS DISTINCT FROM OLD."hiringStatus"
      OR NEW."submittedAt" IS DISTINCT FROM OLD."submittedAt"
      OR NEW."withdrawnAt" IS DISTINCT FROM OLD."withdrawnAt"
      OR NEW."expiresAt" IS DISTINCT FROM OLD."expiresAt"
      OR NEW."retentionPolicyId" IS DISTINCT FROM OLD."retentionPolicyId" THEN
      RAISE EXCEPTION 'retention cannot invent lifecycle history' USING ERRCODE = '23514';
    END IF;
    IF OLD."deletionRequestedAt" IS NULL THEN
      -- Validate live evidence before responsibility begins, including deferred submissions.
      PERFORM public.check_application_submission_evidence(OLD."id");
      IF NEW."deletionCompletedAt" IS NOT NULL OR NEW."expiresAt" > clock_timestamp()
        OR NOT EXISTS (SELECT 1 FROM public."BackgroundJob" j JOIN public."AuditEvent" e
          ON e."correlationId" = j."id"::text AND e."targetId" = NEW."id"
          AND e."actionCode" = 'RETENTION_STARTED' AND e."targetType" = 'APPLICATION'
          AND e."actorType" = 'SYSTEM' AND e."outcome" = 'SUCCEEDED'
          AND e."safeMetadata" = jsonb_build_object('technicalStatus', OLD."technicalStatus", 'hiringStatus', OLD."hiringStatus")
          WHERE j."applicationId" = NEW."id" AND j."jobType" = 'APPLICATION_RETENTION_DELETE'
            AND j."dedupeKey" = 'application-retention:' || NEW."id"::text
            AND j."state" = 'RUNNING' AND j."leaseUntil" > clock_timestamp()) THEN
        RAISE EXCEPTION 'retention responsibility lacks evidence' USING ERRCODE = '23514';
      END IF;
    ELSIF NEW."deletionRequestedAt" IS DISTINCT FROM OLD."deletionRequestedAt" THEN
      RAISE EXCEPTION 'retention request is immutable' USING ERRCODE = '55000';
    END IF;
  ELSIF OLD."deletionRequestedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'retention responsibility cannot be removed' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Application_retention_guard" BEFORE INSERT OR UPDATE ON public."Application"
FOR EACH ROW EXECUTE FUNCTION public.guard_retention_application();

CREATE FUNCTION public.guard_retention_file()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE application_row public."Application"%ROWTYPE;
BEGIN
  SELECT * INTO application_row FROM public."Application"
    WHERE "id" = CASE WHEN TG_OP = 'DELETE' THEN OLD."applicationId" ELSE NEW."applicationId" END FOR UPDATE;
  IF TG_OP = 'INSERT' THEN
    IF NEW."technicalStatus" = 'DELETED' OR application_row."deletionRequestedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'cannot insert a deleted or retention-pending file' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD."technicalStatus" = 'DELETED' THEN
    IF TG_OP = 'DELETE' OR to_jsonb(NEW) - 'updatedAt' <> to_jsonb(OLD) - 'updatedAt' THEN
      RAISE EXCEPTION 'deleted file is immutable' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF application_row."deletionRequestedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'retention requires file tombstones' USING ERRCODE = '55000';
    END IF;
    RETURN OLD;
  END IF;
  IF NEW."technicalStatus" = 'DELETED' THEN
    IF application_row."deletionRequestedAt" IS NULL
      OR (to_jsonb(NEW) - ARRAY['technicalStatus','deletedAt','driveFileId','driveZoneCode','contentHash','version','updatedAt'])
        <> (to_jsonb(OLD) - ARRAY['technicalStatus','deletedAt','driveFileId','driveZoneCode','contentHash','version','updatedAt'])
      OR NOT EXISTS (SELECT 1 FROM public."BackgroundJob" j JOIN public."AuditEvent" e
        ON e."correlationId" = j."id"::text AND e."targetId" = OLD."id"
          AND e."targetType" = 'CANDIDATE_FILE' AND e."actionCode" = 'RETENTION_FILE_DELETED'
          AND e."actorType" = 'SYSTEM' AND e."outcome" = 'SUCCEEDED'
        WHERE j."applicationId" = OLD."applicationId" AND j."jobType" = 'APPLICATION_RETENTION_DELETE'
          AND j."state" = 'RUNNING' AND j."leaseUntil" > clock_timestamp()
          AND EXISTS (SELECT 1 FROM public."AuditEvent" intent WHERE intent."targetId" = OLD."id"
            AND intent."targetType" = 'CANDIDATE_FILE' AND intent."actionCode" = 'RETENTION_STORAGE_VERIFIED'
            AND intent."actorType" = 'SYSTEM' AND intent."outcome" = 'SUCCEEDED' AND intent."correlationId" = j."id"::text)) THEN
      RAISE EXCEPTION 'file deletion lacks authoritative evidence' USING ERRCODE = '23514';
    END IF;
    IF OLD."securityStatus" = 'CLEARED' AND NOT EXISTS (SELECT 1 FROM public."FileSecurityReview" r
      WHERE r."candidateFileId" = OLD."id" AND r."fileHashSnapshot" = OLD."contentHash"
        AND r."method" = OLD."clearanceMethod" AND r."outcome" = 'CLEARED' AND r."completedAt" <= OLD."clearedAt") THEN
      RAISE EXCEPTION 'historical clearance lacks evidence' USING ERRCODE = '23514';
    END IF;
  ELSIF application_row."deletionRequestedAt" IS NOT NULL AND to_jsonb(NEW) <> to_jsonb(OLD) THEN
    RAISE EXCEPTION 'retention-pending file is frozen' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "CandidateFile_retention_guard" BEFORE INSERT OR UPDATE OR DELETE ON public."CandidateFile"
FOR EACH ROW EXECUTE FUNCTION public.guard_retention_file();

CREATE OR REPLACE FUNCTION public.check_application_submission_evidence(application_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE a public."Application"%ROWTYPE;
BEGIN
  SELECT * INTO a FROM public."Application" WHERE "id" = application_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF a."deletionCompletedAt" IS NOT NULL AND NOT public.completed_retention_evidence(a."id") THEN
    RAISE EXCEPTION 'completed retention lacks tombstone evidence' USING ERRCODE = '23514';
  END IF;
  IF a."technicalStatus" <> 'SUBMITTED' THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public."CandidateConsent" WHERE "applicationId" = a."id" AND "decision" = 'ACCEPTED') THEN
    RAISE EXCEPTION 'submitted application lacks accepted consent evidence' USING ERRCODE = '23514';
  END IF;
  IF a."deletionCompletedAt" IS NOT NULL THEN RETURN; END IF;
  IF (a."requiresClearedFile" AND NOT EXISTS (SELECT 1 FROM public."CandidateFile"
      WHERE "applicationId" = a."id" AND "technicalStatus" <> 'DELETED'))
    OR EXISTS (SELECT 1 FROM public."CandidateFile" WHERE "applicationId" = a."id" AND "technicalStatus" <> 'DELETED'
      AND NOT ("validationStatus" = 'PASSED' AND "technicalStatus" = 'QUARANTINED' AND "securityStatus" = 'CLEARED')) THEN
    RAISE EXCEPTION 'submitted application lacks cleared file evidence' USING ERRCODE = '23514';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_cleared_file_review_evidence()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE f public."CandidateFile"%ROWTYPE;
BEGIN
  SELECT * INTO f FROM public."CandidateFile" WHERE "id" = NEW."id";
  IF f."technicalStatus" = 'DELETED' THEN
    IF NOT public.completed_retention_evidence(f."applicationId") THEN
      RAISE EXCEPTION 'deleted file lacks completed retention evidence' USING ERRCODE = '23514';
    END IF;
  ELSIF f."securityStatus" = 'CLEARED' AND NOT EXISTS (SELECT 1 FROM public."FileSecurityReview" r
    WHERE r."candidateFileId" = f."id" AND r."outcome" = 'CLEARED' AND r."method" = f."clearanceMethod"
      AND r."fileHashSnapshot" = f."contentHash" AND r."completedAt" <= f."clearedAt") THEN
    RAISE EXCEPTION 'cleared file lacks matching immutable review evidence' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

-- Evidence on which completed tombstones depend cannot later be removed or changed.
CREATE FUNCTION public.protect_retention_job_evidence()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD."jobType" = 'APPLICATION_RETENTION_DELETE' AND OLD."state" = 'SUCCEEDED'
    AND EXISTS (SELECT 1 FROM public."Application" WHERE "id" = OLD."applicationId" AND "deletionCompletedAt" IS NOT NULL) THEN
    RAISE EXCEPTION 'retention completion job is historical evidence' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "BackgroundJob_retention_evidence" BEFORE UPDATE OR DELETE ON public."BackgroundJob"
FOR EACH ROW EXECUTE FUNCTION public.protect_retention_job_evidence();

CREATE FUNCTION public.guard_tombstone_answers()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE pending boolean;
BEGIN
  PERFORM 1 FROM public."Application" WHERE "id" = NEW."applicationId" FOR UPDATE;
  SELECT "deletionRequestedAt" IS NOT NULL INTO pending FROM public."Application" WHERE "id" = NEW."applicationId";
  IF pending THEN RAISE EXCEPTION 'retention application cannot receive answers' USING ERRCODE = '55000'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ApplicationAnswer_retention_guard" BEFORE INSERT OR UPDATE ON public."ApplicationAnswer"
FOR EACH ROW EXECUTE FUNCTION public.guard_tombstone_answers();

CREATE FUNCTION public.guard_retention_review()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE pending boolean;
BEGIN
  PERFORM 1 FROM public."CandidateFile" f JOIN public."Application" a ON a."id" = f."applicationId"
    WHERE f."id" = NEW."candidateFileId"
    FOR UPDATE OF a, f;
  SELECT f."technicalStatus" = 'DELETED' OR a."deletionRequestedAt" IS NOT NULL INTO pending
    FROM public."CandidateFile" f JOIN public."Application" a ON a."id" = f."applicationId" WHERE f."id" = NEW."candidateFileId";
  IF pending THEN RAISE EXCEPTION 'deleted content cannot be reviewed' USING ERRCODE = '55000'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "FileSecurityReview_retention_guard" BEFORE INSERT ON public."FileSecurityReview"
FOR EACH ROW EXECUTE FUNCTION public.guard_retention_review();

REVOKE ALL ON FUNCTION public.completed_retention_evidence(uuid), public.guard_retention_application(),
  public.guard_retention_file(), public.protect_retention_job_evidence(), public.guard_tombstone_answers(), public.guard_retention_review()
  FROM PUBLIC, anon, authenticated;
