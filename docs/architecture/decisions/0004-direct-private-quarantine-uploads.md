# ADR 0004: Server-mediated private quarantine uploads

**Status:** Accepted

**Phase 0D2 revision:** Candidate documents use a private Google Drive account rather than browser-addressable object storage. After server validation of intent, the browser sends one bounded stream to the application server; only the server authenticates to Drive and stores the file in private quarantine. Drive credentials never reach browsers.

Names are random/non-semantic. The server validates size, declared MIME, extension and PDF signature before upload, records the Drive file ID/checksum/state, and reconciles partial external writes. This validation is not malware scanning.
