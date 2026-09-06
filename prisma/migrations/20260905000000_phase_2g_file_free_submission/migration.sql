-- Existing records and legacy callers retain the file-required contract.
ALTER TABLE public."Application"
  ADD COLUMN "requiresClearedFile" boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.protect_application_context()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW."applicationType" IS DISTINCT FROM OLD."applicationType"
    OR NEW."jobId" IS DISTINCT FROM OLD."jobId"
    OR NEW."engagementType" IS DISTINCT FROM OLD."engagementType"
    OR NEW."requiresClearedFile" IS DISTINCT FROM OLD."requiresClearedFile" THEN
    RAISE EXCEPTION 'application context is immutable' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.check_application_submission_evidence(application_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE application_row public."Application"%ROWTYPE;
BEGIN
  SELECT * INTO application_row FROM public."Application" WHERE "id" = application_id FOR UPDATE;
  IF NOT FOUND OR application_row."technicalStatus" <> 'SUBMITTED' THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public."CandidateConsent"
    WHERE "applicationId" = application_id AND "decision" = 'ACCEPTED') THEN
    RAISE EXCEPTION 'submitted application lacks accepted consent evidence' USING ERRCODE = '23514';
  END IF;
  IF (application_row."requiresClearedFile" AND NOT EXISTS (
      SELECT 1 FROM public."CandidateFile" WHERE "applicationId" = application_id
      AND "technicalStatus" <> 'DELETED'))
    OR EXISTS (SELECT 1 FROM public."CandidateFile" WHERE "applicationId" = application_id
      AND "technicalStatus" <> 'DELETED'
      AND NOT ("validationStatus" = 'PASSED' AND "technicalStatus" = 'QUARANTINED'
        AND "securityStatus" = 'CLEARED')) THEN
    RAISE EXCEPTION 'submitted application lacks cleared file evidence' USING ERRCODE = '23514';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_submitted_application_evidence()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  -- Read final transaction state rather than an obsolete deferred NEW snapshot.
  PERFORM public.check_application_submission_evidence(NEW."id");
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.serialize_application_file_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."applicationId" IS DISTINCT FROM OLD."applicationId" THEN
    RAISE EXCEPTION 'file application context is immutable' USING ERRCODE = '55000';
  END IF;
  -- A real row version change serializes with submission, including at repeatable read.
  -- It also queues the existing deferred application constraint for file-only writes.
  UPDATE public."Application" SET "updatedAt" = "updatedAt"
    WHERE "id" = CASE WHEN TG_OP = 'DELETE' THEN OLD."applicationId" ELSE NEW."applicationId" END;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "CandidateFile_application_evidence"
BEFORE INSERT OR UPDATE OR DELETE ON public."CandidateFile"
FOR EACH ROW EXECUTE FUNCTION public.serialize_application_file_change();

REVOKE ALL PRIVILEGES ON FUNCTION public.check_application_submission_evidence(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON FUNCTION public.serialize_application_file_change() FROM PUBLIC, anon, authenticated;
