-- Provision restricted NOLOGIN capability/locking roles operationally first.
-- The migration role owns this database/schema and may SET the locking role.
-- Passwords, login membership and credential rotation are never migration inputs.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM pg_roles WHERE rolname IN ('pyramid_runtime', 'pyramid_reference_locker') LOOP
    IF r.rolcanlogin OR r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls
      OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member = r.oid)
      OR EXISTS (SELECT 1 FROM pg_class WHERE relowner = r.oid)
      OR EXISTS (SELECT 1 FROM pg_namespace WHERE nspowner = r.oid)
      OR EXISTS (SELECT 1 FROM pg_database WHERE datdba = r.oid)
      OR EXISTS (SELECT 1 FROM pg_proc WHERE proowner = r.oid) THEN
      RAISE EXCEPTION 'B1 capability roles must be restricted, unowned and without parent memberships';
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM pg_roles WHERE rolname IN ('pyramid_runtime', 'pyramid_reference_locker')) <> 2
    OR NOT pg_has_role(current_user, 'pyramid_reference_locker', 'SET')
    OR NOT pg_has_role(current_user, 'pyramid_reference_locker', 'USAGE') THEN
    RAISE EXCEPTION 'B1 operational role prerequisites are missing';
  END IF;
  EXECUTE format('REVOKE CREATE, TEMPORARY ON DATABASE %I FROM PUBLIC, anon, authenticated, pyramid_runtime, pyramid_reference_locker', current_database());
END;
$$;

REVOKE ALL ON SCHEMA public FROM PUBLIC, anon, authenticated, pyramid_runtime, pyramid_reference_locker;
GRANT USAGE ON SCHEMA public TO pyramid_runtime, pyramid_reference_locker;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated, pyramid_runtime, pyramid_reference_locker;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated, pyramid_runtime, pyramid_reference_locker;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated, pyramid_runtime, pyramid_reference_locker;
-- Table-level REVOKE does not remove pre-existing column ACLs.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT c.relname, string_agg(format('%I', a.attname), ', ' ORDER BY a.attnum) AS columns
    FROM pg_class c JOIN pg_attribute a ON a.attrelid=c.oid
    WHERE c.relnamespace='public'::regnamespace AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped
    GROUP BY c.oid, c.relname LOOP
    EXECUTE format('REVOKE ALL (%s) ON public.%I FROM PUBLIC, anon, authenticated, pyramid_runtime, pyramid_reference_locker', t.columns, t.relname);
  END LOOP;
END;
$$;
-- Global function defaults must be revoked globally, not just per schema.
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, pyramid_runtime;
ALTER DEFAULT PRIVILEGES REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated, pyramid_runtime;
ALTER DEFAULT PRIVILEGES REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated, pyramid_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, pyramid_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated, pyramid_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated, pyramid_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE pyramid_reference_locker REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, pyramid_runtime;

-- Server authorization remains authoritative. RLS isolates DB identities;
-- named operation/column grants below constrain the trusted server capability.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['StaffUser','UserRole','Department','Project','JobLocation','Job',
    'JobQuestion','JobQuestionOption','ConsentDefinition','RetentionPolicy','Application',
    'ApplicationAnswer','CandidateFile','FileSecurityReview','CandidateConsent','ApplicationStatusEvent',
    'AuditEvent','BackgroundJob','IdempotencyRecord','RateLimitBucket'] LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO pyramid_runtime', t);
    EXECUTE format('CREATE POLICY b1_runtime_select ON public.%I FOR SELECT TO pyramid_runtime USING (true)', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['Project','Application','ApplicationAnswer','CandidateFile','FileSecurityReview',
    'CandidateConsent','ApplicationStatusEvent','AuditEvent','BackgroundJob','IdempotencyRecord','RateLimitBucket'] LOOP
    EXECUTE format('GRANT INSERT ON public.%I TO pyramid_runtime', t);
    EXECUTE format('CREATE POLICY b1_runtime_insert ON public.%I FOR INSERT TO pyramid_runtime WITH CHECK (true)', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['Project','Job','Application','CandidateFile','BackgroundJob','IdempotencyRecord','RateLimitBucket'] LOOP
    EXECUTE format('CREATE POLICY b1_runtime_update ON public.%I FOR UPDATE TO pyramid_runtime USING (true) WITH CHECK (true)', t);
  END LOOP;
END;
$$;

GRANT UPDATE ("title", "summary", "version", "updatedAt") ON public."Project" TO pyramid_runtime;
GRANT UPDATE ("lifecycleState", "version", "closedAt", "archivedAt", "updatedAt") ON public."Job" TO pyramid_runtime;
GRANT UPDATE ("technicalStatus", "hiringStatus", "submittedAt", "withdrawnAt", "updatedAt",
  "deletionRequestedAt", "deletionCompletedAt", "fullName", "email", "city", "phoneOrWhatsApp",
  "specialism", "portfolioUrl", "professionalUrl", "availabilityText", "remoteAvailable", "shortIntroduction",
  "preferredEngagement", "freelancerRateMinMinor", "freelancerRateMaxMinor", "rateCurrency",
  "accommodationContactRequested", "safeCampaignCode", "experienceLevel", "source") ON public."Application" TO pyramid_runtime;
GRANT UPDATE ("technicalStatus", "securityStatus", "clearanceMethod", "clearedAt", "driveFileId",
  "driveZoneCode", "contentHash", "deletedAt", "version", "updatedAt") ON public."CandidateFile" TO pyramid_runtime;
GRANT UPDATE ("state", "attemptCount", "claimedAt", "leaseUntil", "claimToken", "availableAt",
  "completedAt", "failureClass", "errorSummary", "updatedAt") ON public."BackgroundJob" TO pyramid_runtime;
GRANT UPDATE ("state", "resultReference", "requestHash", "expiresAt") ON public."IdempotencyRecord" TO pyramid_runtime;
GRANT UPDATE ("count", "expiresAt") ON public."RateLimitBucket" TO pyramid_runtime;
GRANT DELETE ON public."ApplicationAnswer", public."IdempotencyRecord" TO pyramid_runtime;
CREATE POLICY b1_retention_answer_delete ON public."ApplicationAnswer" FOR DELETE TO pyramid_runtime
  USING (EXISTS (SELECT 1 FROM public."Application" a WHERE a."id" = "applicationId" AND a."deletionRequestedAt" IS NOT NULL));
CREATE POLICY b1_expired_staff_idempotency_delete ON public."IdempotencyRecord" FOR DELETE TO pyramid_runtime
  USING ("scope" LIKE 'staff:%' AND "expiresAt" <= CURRENT_TIMESTAMP);
GRANT EXECUTE ON FUNCTION public.check_application_submission_evidence(uuid), public.completed_retention_evidence(uuid) TO pyramid_runtime;

-- Only the dedicated locking owner can obtain lock-required UPDATE(id).
-- WITH CHECK(false) forbids all actual updates, including id=id.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['StaffUser','UserRole','Department','ConsentDefinition','RetentionPolicy','JobQuestion','JobQuestionOption'] LOOP
    EXECUTE format('GRANT SELECT, UPDATE ("id") ON public.%I TO pyramid_reference_locker', t);
    EXECUTE format('CREATE POLICY b1_reference_select ON public.%I FOR SELECT TO pyramid_reference_locker USING (true)', t);
    EXECUTE format('CREATE POLICY b1_reference_lock ON public.%I FOR UPDATE TO pyramid_reference_locker USING (true) WITH CHECK (false)', t);
  END LOOP;
END;
$$;
CREATE SCHEMA pyramid_private;
REVOKE ALL ON SCHEMA pyramid_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA pyramid_private TO pyramid_runtime, pyramid_reference_locker;
CREATE FUNCTION pyramid_private.lock_reference(kind text, target uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  CASE kind
    WHEN 'STAFF' THEN
      PERFORM "id" FROM public."StaffUser" WHERE "id" = target FOR SHARE;
      PERFORM "id" FROM public."UserRole" WHERE "staffUserId" = target ORDER BY "id" FOR SHARE;
    WHEN 'STAFF_USER' THEN
      PERFORM "id" FROM public."StaffUser" WHERE "id" = target FOR SHARE;
    WHEN 'DEPARTMENT' THEN
      PERFORM "id" FROM public."Department" WHERE "id" = target FOR SHARE;
    WHEN 'CONSENT' THEN
      PERFORM "id" FROM public."ConsentDefinition" WHERE "id" = target FOR SHARE;
    WHEN 'RETENTION' THEN
      PERFORM "id" FROM public."RetentionPolicy" WHERE "id" = target FOR SHARE;
    WHEN 'JOB_QUESTIONS' THEN
      PERFORM "id" FROM public."JobQuestion" WHERE "jobId" = target ORDER BY "id" FOR UPDATE;
      PERFORM o."id" FROM public."JobQuestionOption" o JOIN public."JobQuestion" q ON q."id" = o."jobQuestionId"
        WHERE q."jobId" = target ORDER BY o."id" FOR SHARE OF o;
    ELSE RAISE EXCEPTION 'Unknown reference lock' USING ERRCODE = '22023';
  END CASE;
END;
$$;
REVOKE ALL ON FUNCTION pyramid_private.lock_reference(text, uuid) FROM PUBLIC, anon, authenticated;
-- Ownership transfer requires temporary schema CREATE; revoke immediately.
GRANT CREATE ON SCHEMA pyramid_private TO pyramid_reference_locker;
ALTER FUNCTION pyramid_private.lock_reference(text, uuid) OWNER TO pyramid_reference_locker;
REVOKE CREATE ON SCHEMA pyramid_private FROM pyramid_reference_locker;
GRANT EXECUTE ON FUNCTION pyramid_private.lock_reference(text, uuid) TO pyramid_runtime;
