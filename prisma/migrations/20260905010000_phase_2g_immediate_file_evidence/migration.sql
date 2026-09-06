-- Migration seven is already applied in development; preserve its history.
-- An immediate parent constraint must see the file's NEW state, not its old state.
-- The real parent UPDATE still serializes file writes with submission at all
-- supported isolation levels and queues deferred validation when requested.
DROP TRIGGER "CandidateFile_application_evidence" ON public."CandidateFile";

CREATE TRIGGER "CandidateFile_application_evidence"
AFTER INSERT OR UPDATE OR DELETE ON public."CandidateFile"
FOR EACH ROW EXECUTE FUNCTION public.serialize_application_file_change();
