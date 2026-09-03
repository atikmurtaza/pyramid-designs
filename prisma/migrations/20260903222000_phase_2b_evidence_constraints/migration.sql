-- Enforce hash-bound file clearance and submission evidence at transaction commit.
CREATE FUNCTION public.enforce_cleared_file_review_evidence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW."securityStatus" = 'CLEARED' AND NOT EXISTS (
    SELECT 1
    FROM public."FileSecurityReview" review
    WHERE review."candidateFileId" = NEW."id"
      AND review."outcome" = 'CLEARED'
      AND review."method" = NEW."clearanceMethod"
      AND review."fileHashSnapshot" = NEW."contentHash"
      AND review."completedAt" <= NEW."clearedAt"
  ) THEN
    RAISE EXCEPTION 'cleared file lacks matching immutable review evidence' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "CandidateFile_clearance_evidence"
AFTER INSERT OR UPDATE ON public."CandidateFile"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.enforce_cleared_file_review_evidence();

CREATE FUNCTION public.enforce_submitted_application_evidence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW."technicalStatus" = 'SUBMITTED' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public."CandidateConsent" consent
      WHERE consent."applicationId" = NEW."id" AND consent."decision" = 'ACCEPTED'
    ) THEN
      RAISE EXCEPTION 'submitted application lacks accepted consent evidence' USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public."CandidateFile" file
      WHERE file."applicationId" = NEW."id"
        AND file."validationStatus" = 'PASSED'
        AND file."technicalStatus" = 'QUARANTINED'
        AND file."securityStatus" = 'CLEARED'
    ) THEN
      RAISE EXCEPTION 'submitted application lacks cleared file evidence' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "Application_submission_evidence"
AFTER INSERT OR UPDATE ON public."Application"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.enforce_submitted_application_evidence();

REVOKE ALL PRIVILEGES ON FUNCTION public.enforce_cleared_file_review_evidence() FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON FUNCTION public.enforce_submitted_application_evidence() FROM PUBLIC, anon, authenticated;
