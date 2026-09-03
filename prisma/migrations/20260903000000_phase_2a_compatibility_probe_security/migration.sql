-- Keep the temporary compatibility table server-only.
REVOKE ALL PRIVILEGES ON TABLE public."CompatibilityProbe" FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public."CompatibilityProbe" FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public."CompatibilityProbe" FROM authenticated;

-- No public policies: the approved Prisma database role retains server access.
ALTER TABLE public."CompatibilityProbe" ENABLE ROW LEVEL SECURITY;
