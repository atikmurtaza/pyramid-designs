# ADR 0011: Initial zero-cost Supabase data and staff identity

**Status:** Accepted — owner/reviewer approved 2026-08-27

Use Supabase Free in the selected Pakistan-near region for the initial standard PostgreSQL system of record and staff-only authentication with required basic TOTP MFA. Pyramid Designs keeps roles and all authorization in its own PostgreSQL policy model; no candidate account or Supabase Storage use is adopted.

This is a £0 incremental-cost choice, not paid-production equivalence: the reviewed free tier has constrained capacity, can pause after inactivity, and has no automatic backup/PITR. Candidate/admin operations fail closed. Before real candidate intake, the named operator must perform encrypted logical exports and restore testing under an approved procedure; otherwise select an approved paid PostgreSQL/auth escalation.
