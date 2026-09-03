-- Complete the approved application snapshot shape without inventing policy values.
ALTER TABLE public."Application"
  ADD CONSTRAINT "Application_contact_snapshot_check"
  CHECK (
    "deletionCompletedAt" IS NOT NULL
    OR ("fullName" IS NOT NULL AND "email" IS NOT NULL AND "city" IS NOT NULL)
  ),
  ADD CONSTRAINT "Application_portfolio_introduction_check"
  CHECK (
    "engagementType" <> 'PORTFOLIO_INTRODUCTION'
    OR "portfolioUrl" IS NOT NULL
    OR "professionalUrl" IS NOT NULL
  );
