-- B2: application-scoped append-only notes and executable admin capability extensions.
-- No login, credential, production policy or provider activation belongs here.
CREATE INDEX "AuditEvent_occurredAt_id_idx" ON public."AuditEvent"("occurredAt", "id");
CREATE TABLE public."InternalNote" (
  "id" uuid NOT NULL,
  "applicationId" uuid NOT NULL,
  "authorStaffUserId" uuid NOT NULL,
  "body" varchar(2000) NOT NULL,
  "createdAt" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InternalNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES public."Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InternalNote_authorStaffUserId_fkey" FOREIGN KEY ("authorStaffUserId") REFERENCES public."StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InternalNote_body_check" CHECK (length(btrim("body")) BETWEEN 1 AND 2000 AND "body" ~ '[^[:space:]]')
);
CREATE INDEX "InternalNote_applicationId_createdAt_id_idx" ON public."InternalNote"("applicationId", "createdAt", "id");
ALTER TABLE public."InternalNote" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."InternalNote" FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public."InternalNote" TO pyramid_runtime;
CREATE POLICY b2_note_select ON public."InternalNote" FOR SELECT TO pyramid_runtime USING (true);
CREATE POLICY b2_note_insert ON public."InternalNote" FOR INSERT TO pyramid_runtime WITH CHECK (true);
CREATE TRIGGER "InternalNote_immutable" BEFORE UPDATE OR DELETE ON public."InternalNote"
FOR EACH ROW EXECUTE FUNCTION public.prevent_immutable_change();

CREATE FUNCTION public.guard_internal_note()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE a public."Application"%ROWTYPE;
BEGIN
  -- SHARE permits independent concurrent appends while excluding lifecycle/erasure writes.
  SELECT * INTO a FROM public."Application" WHERE "id"=NEW."applicationId" FOR SHARE;
  IF NOT FOUND OR a."technicalStatus" <> 'SUBMITTED' OR a."expiresAt" <= clock_timestamp()
    OR a."deletionRequestedAt" IS NOT NULL OR a."deletionCompletedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'application unavailable for notes' USING ERRCODE='23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public."StaffUser" WHERE "id"=NEW."authorStaffUserId" AND "status"='ACTIVE') THEN
    RAISE EXCEPTION 'note author unavailable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "InternalNote_context" BEFORE INSERT ON public."InternalNote"
FOR EACH ROW EXECUTE FUNCTION public.guard_internal_note();

CREATE FUNCTION public.guard_note_retention_completion()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW."deletionCompletedAt" IS NOT NULL AND EXISTS (
    SELECT 1 FROM public."InternalNote" WHERE "applicationId"=NEW."id") THEN
    RAISE EXCEPTION 'note erasure mechanism requires later retention review' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Application_note_retention_completion" BEFORE UPDATE ON public."Application"
FOR EACH ROW EXECUTE FUNCTION public.guard_note_retention_completion();
-- No InternalNote DELETE grant. Production erasure remains unresolved and closed.

GRANT UPDATE ("clientDescriptor", "year", "brief", "challenge", "approach", "outcome", "featured",
  "publicationState", "publishAt", "publishedAt", "archivedAt") ON public."Project" TO pyramid_runtime;
GRANT INSERT ON public."Job" TO pyramid_runtime;
CREATE POLICY b2_job_insert ON public."Job" FOR INSERT TO pyramid_runtime
  WITH CHECK ("lifecycleState"='DRAFT' AND "publishedAt" IS NULL AND "closedAt" IS NULL AND "archivedAt" IS NULL);
GRANT UPDATE ("title", "departmentId", "jobLocationId", "workArrangement", "employmentType", "experienceLevel",
  "shiftSchedule", "compensationMode", "compensationMinMinor", "compensationMaxMinor", "compensationCurrency",
  "compensationPeriod", "compensationText", "summary", "responsibilities", "requiredQualifications",
  "preferredQualifications", "hiringProcessCopy", "applicationDeadline", "publishAt", "publishedAt") ON public."Job" TO pyramid_runtime;
GRANT INSERT ON public."JobQuestion", public."JobQuestionOption" TO pyramid_runtime;
GRANT UPDATE ("questionType", "prompt", "required", "sortOrder", "active") ON public."JobQuestion" TO pyramid_runtime;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['JobQuestion','JobQuestionOption'] LOOP
    EXECUTE format('CREATE POLICY b2_question_insert ON public.%I FOR INSERT TO pyramid_runtime WITH CHECK (true)',t);
  END LOOP;
END; $$;
CREATE POLICY b2_question_update ON public."JobQuestion" FOR UPDATE TO pyramid_runtime USING (true) WITH CHECK (true);
-- Replacing unused draft options requires removal; used-question immutability remains authoritative.
GRANT DELETE ON public."JobQuestionOption" TO pyramid_runtime;
CREATE POLICY b2_unused_option_delete ON public."JobQuestionOption" FOR DELETE TO pyramid_runtime
  USING (EXISTS (SELECT 1 FROM public."JobQuestion" q JOIN public."Job" j ON j."id"=q."jobId"
    WHERE q."id"="jobQuestionId" AND j."lifecycleState"='DRAFT'
      AND NOT EXISTS (SELECT 1 FROM public."ApplicationAnswer" a WHERE a."jobQuestionId"=q."id")));
-- No Job or JobQuestion hard-delete permission.

GRANT SELECT ON public."Discipline", public."Sector", public."ProjectMedia", public."ProjectCredit",
  public."ProjectDiscipline", public."ProjectSector" TO pyramid_runtime;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['Discipline','Sector','ProjectMedia','ProjectCredit','ProjectDiscipline','ProjectSector'] LOOP
    EXECUTE format('CREATE POLICY b2_content_select ON public.%I FOR SELECT TO pyramid_runtime USING (true)',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['ProjectCredit','ProjectDiscipline','ProjectSector'] LOOP
    EXECUTE format('GRANT INSERT, DELETE ON public.%I TO pyramid_runtime',t);
    EXECUTE format('CREATE POLICY b2_relation_insert ON public.%I FOR INSERT TO pyramid_runtime WITH CHECK (EXISTS (SELECT 1 FROM public."Project" p WHERE p."id"="projectId" AND p."publicationState"=''DRAFT''))',t);
    EXECUTE format('CREATE POLICY b2_relation_delete ON public.%I FOR DELETE TO pyramid_runtime USING (EXISTS (SELECT 1 FROM public."Project" p WHERE p."id"="projectId" AND p."publicationState"=''DRAFT''))',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['ProjectMedia'] LOOP
    EXECUTE format('CREATE POLICY b2_relation_update ON public.%I FOR UPDATE TO pyramid_runtime USING (EXISTS (SELECT 1 FROM public."Project" p WHERE p."id"="projectId" AND p."publicationState"=''DRAFT'')) WITH CHECK (EXISTS (SELECT 1 FROM public."Project" p WHERE p."id"="projectId" AND p."publicationState"=''DRAFT''))',t);
  END LOOP;
END; $$;
GRANT UPDATE ("altText", "caption", "accessibilityDescription", "sortOrder", "updatedAt") ON public."ProjectMedia" TO pyramid_runtime;
-- Media IDs, sources, delivery paths and project ownership are operator-curated, never ingested/reparented by B2.

CREATE FUNCTION public.serialize_project_relationship()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE parent uuid; state public."PublicationState";
BEGIN
  parent := CASE WHEN TG_OP='DELETE' THEN OLD."projectId" ELSE NEW."projectId" END;
  SELECT "publicationState" INTO state FROM public."Project" WHERE "id"=parent FOR UPDATE;
  IF pg_has_role(current_user,'pyramid_runtime','USAGE') AND (state IS NULL OR state<>'DRAFT') THEN
    RAISE EXCEPTION 'draft relationship required' USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' AND OLD."projectId"<>NEW."projectId" THEN
    RAISE EXCEPTION 'relationship ownership immutable' USING ERRCODE='55000';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['ProjectMedia','ProjectCredit','ProjectDiscipline','ProjectSector'] LOOP
    EXECUTE format('CREATE TRIGGER b2_project_relationship BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.serialize_project_relationship()',t);
  END LOOP;
END; $$;

CREATE FUNCTION public.serialize_job_question()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE parent uuid; state public."JobLifecycleState";
BEGIN
  IF TG_TABLE_NAME='JobQuestion' THEN
    parent:=CASE WHEN TG_OP='DELETE' THEN OLD."jobId" ELSE NEW."jobId" END;
  ELSE
    SELECT "jobId" INTO parent FROM public."JobQuestion" WHERE "id"=
      CASE WHEN TG_OP='DELETE' THEN OLD."jobQuestionId" ELSE NEW."jobQuestionId" END;
  END IF;
  SELECT "lifecycleState" INTO state FROM public."Job" WHERE "id"=parent FOR UPDATE;
  IF pg_has_role(current_user,'pyramid_runtime','USAGE') AND (state IS NULL OR state<>'DRAFT') THEN
    RAISE EXCEPTION 'draft question required' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER b2_question_parent BEFORE INSERT OR UPDATE OR DELETE ON public."JobQuestion"
FOR EACH ROW EXECUTE FUNCTION public.serialize_job_question();
CREATE TRIGGER b2_option_parent BEFORE INSERT OR UPDATE OR DELETE ON public."JobQuestionOption"
FOR EACH ROW EXECUTE FUNCTION public.serialize_job_question();

-- Extend the already-approved fixed locking boundary for active public references.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['JobLocation','Discipline','Sector'] LOOP
    EXECUTE format('GRANT SELECT, UPDATE ("id") ON public.%I TO pyramid_reference_locker',t);
    EXECUTE format('CREATE POLICY b2_reference_select ON public.%I FOR SELECT TO pyramid_reference_locker USING (true)',t);
    EXECUTE format('CREATE POLICY b2_reference_lock ON public.%I FOR UPDATE TO pyramid_reference_locker USING (true) WITH CHECK (false)',t);
  END LOOP;
END; $$;
CREATE OR REPLACE FUNCTION pyramid_private.lock_reference(kind text, target uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  CASE kind
    WHEN 'STAFF' THEN
      PERFORM "id" FROM public."StaffUser" WHERE "id"=target FOR SHARE;
      PERFORM "id" FROM public."UserRole" WHERE "staffUserId"=target ORDER BY "id" FOR SHARE;
    WHEN 'STAFF_USER' THEN PERFORM "id" FROM public."StaffUser" WHERE "id"=target FOR SHARE;
    WHEN 'DEPARTMENT' THEN PERFORM "id" FROM public."Department" WHERE "id"=target FOR SHARE;
    WHEN 'CONSENT' THEN PERFORM "id" FROM public."ConsentDefinition" WHERE "id"=target FOR SHARE;
    WHEN 'RETENTION' THEN PERFORM "id" FROM public."RetentionPolicy" WHERE "id"=target FOR SHARE;
    WHEN 'LOCATION' THEN PERFORM "id" FROM public."JobLocation" WHERE "id"=target FOR SHARE;
    WHEN 'DISCIPLINE' THEN PERFORM "id" FROM public."Discipline" WHERE "id"=target FOR SHARE;
    WHEN 'SECTOR' THEN PERFORM "id" FROM public."Sector" WHERE "id"=target FOR SHARE;
    WHEN 'JOB_QUESTIONS' THEN
      PERFORM "id" FROM public."JobQuestion" WHERE "jobId"=target ORDER BY "id" FOR UPDATE;
      PERFORM o."id" FROM public."JobQuestionOption" o JOIN public."JobQuestion" q ON q."id"=o."jobQuestionId"
        WHERE q."jobId"=target ORDER BY o."id" FOR SHARE OF o;
    ELSE RAISE EXCEPTION 'Unknown reference lock' USING ERRCODE='22023';
  END CASE;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_internal_note(), public.guard_note_retention_completion(),
  public.serialize_project_relationship(), public.serialize_job_question() FROM PUBLIC, anon, authenticated, pyramid_runtime;
