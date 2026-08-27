# ADR 0010: Private Google Drive candidate documents

**Status:** Accepted

Use an existing dedicated company Google Drive account for private candidate documents. The application server uploads after validation using a confidential OAuth web-server credential with offline access; browser clients receive no Google credential or Drive URL. Generated opaque PDF filenames and application-created private folders are operational organisation only.

PostgreSQL remains authoritative for file ID, technical state, validation/scan state, candidate identity, hiring status, retention/deletion and audit events. Staff access uses a server-authorized attachment stream after a fresh default-deny policy check. Do not grant general staff Drive membership or enable public/link sharing.

A Workspace Shared Drive/service account is an alternative only when the owner already has it: service accounts cannot own files because they have no Drive storage quota.
