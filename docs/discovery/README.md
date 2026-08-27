# Discovery and Phase 0 records

Phase 0E is complete at the documentation level. Phase 0 as a whole is **not complete**: owner/legal/operations decisions and the final Phase 0 gate remain open, and no application or provider implementation is authorised.

| Phase | Status | Record |
| --- | --- | --- |
| Phase 0A — Repository, requirements and asset discovery | Complete | [Phase 0A audit](phase-0a-repository-audit.md) |
| Phase 0B — Requirements and decision classification | Complete | [Phase 0B matrix](phase-0b-requirements-matrix.md) |
| Phase 0C — System architecture and threat model | Approved direction; implementation verification pending | [System architecture](../architecture/system-architecture.md), [threat model](../security/threat-model.md) |
| Phase 0D1 — Paid provider evaluation | Superseded by Phase 0D2 | [Provider evaluation](../architecture/provider-evaluation.md) |
| Phase 0D2 — Hostinger/Supabase/Drive zero-cost revision | Owner/reviewer approved 2026-08-27; production-intake gates remain | [Provider evaluation](../architecture/provider-evaluation.md), ADRs [0009](../architecture/decisions/0009-hostinger-first-zero-cost-hosting.md), [0010](../architecture/decisions/0010-private-google-drive-candidate-documents.md), [0011](../architecture/decisions/0011-zero-cost-supabase-data-and-auth.md) |
| Phase 0E — Data, state, and authorization model | Complete; awaiting final Phase 0 gate | [Data model](../architecture/data-model.md), [state machines](../architecture/state-machines.md), [authorization model](../security/authorization-model.md), ADRs [0012](../architecture/decisions/0012-application-owned-candidate-data.md), [0013](../architecture/decisions/0013-postgresql-backed-background-jobs.md) |

Do not begin an implementation phase until the owner/reviewer approves the final Phase 0 gate and its remaining decisions.
