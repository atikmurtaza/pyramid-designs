# ADR 0011: Initial zero-cost Supabase data and staff identity

**Status:** Proposed — owner approval required

Use Supabase Free in the selected Pakistan-near region for the initial standard PostgreSQL system of record and staff-only authentication with required basic TOTP MFA. Pyramid Designs keeps roles and all authorization in its own PostgreSQL policy model; no candidate account or Supabase Storage use is adopted.

This is a £0 incremental-cost choice, not a paid-production equivalence: the current free tier is 500 MB, pauses after one inactive week and has no automatic backups/PITR. Candidate/admin operations fail closed. Before real candidate intake, the owner must accept those limits and name an encrypted-export/restore-test owner; otherwise select an approved paid PostgreSQL/auth escalation.
