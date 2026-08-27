# Discovery and Phase 0 records

Phase 0 is complete at the documentation/architecture level with a **PASS WITH ISSUES** gate. Phase 1 may begin only after owner/reviewer approval. No implementation, cloud resource, production deployment or DNS change is authorised by this tracker.

| Phase | Status | Record |
| --- | --- | --- |
| Phase 0A — Repository, requirements and asset discovery | Complete | [Phase 0A audit](phase-0a-repository-audit.md) |
| Phase 0B — Requirements and decision classification | Complete | [Phase 0B matrix](phase-0b-requirements-matrix.md) |
| Phase 0C — System architecture and threat model | Complete; implementation verification pending | [System architecture](../architecture/system-architecture.md), [threat model](../security/threat-model.md) |
| Phase 0D1 — Paid provider evaluation | **SUPERSEDED** research retained | [Provider evaluation](../architecture/provider-evaluation.md) |
| Phase 0D2 — Hostinger/Supabase/Drive zero-cost revision | Complete; owner/reviewer approved 2026-08-27 | [Provider evaluation](../architecture/provider-evaluation.md), ADRs [0009](../architecture/decisions/0009-hostinger-first-zero-cost-hosting.md), [0010](../architecture/decisions/0010-private-google-drive-candidate-documents.md), [0011](../architecture/decisions/0011-zero-cost-supabase-data-and-auth.md) |
| Phase 0E — Data, state and authorization model | Complete | [Data model](../architecture/data-model.md), [state machines](../architecture/state-machines.md), [authorization model](../security/authorization-model.md), ADRs [0012](../architecture/decisions/0012-application-owned-candidate-data.md), [0013](../architecture/decisions/0013-postgresql-backed-background-jobs.md) |
| Phase 0F — Final architecture and operations gate | Complete — **PASS WITH ISSUES** | [Final gate](phase-0-final-gate.md), [candidate-file SOP](../operations/candidate-file-security-review.md), [backup/restore](../operations/backup-and-restore.md), [implementation checklist](../implementation/readiness-checklist.md) |

The remaining issues are explicit owner-account, implementation, content, HR, legal/privacy and production gates. They do not block Phase 1 visual/design prototyping with clearly labelled synthetic development content.

Phase 1 has **not** started.
