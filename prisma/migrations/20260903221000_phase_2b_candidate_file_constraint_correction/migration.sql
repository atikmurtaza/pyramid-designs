-- Correct the Phase 2B opaque PDF filename regex without rewriting applied history.
ALTER TABLE public."CandidateFile"
  DROP CONSTRAINT "CandidateFile_pdf_metadata_check",
  ADD CONSTRAINT "CandidateFile_pdf_metadata_check"
  CHECK (
    "extension" = 'pdf'
    AND "storedFilename" ~ '^[a-f0-9-]+[.]pdf$'
    AND "sizeBytes" > 0
    AND "sizeBytes" <= 5242880
  );
